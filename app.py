import os
import json
from waitress import serve
from werkzeug.exceptions import HTTPException
from flask import Flask, request, session, make_response, render_template

# local modules
import logger
from oauth import gcp
from api import rest
from datastore import sql
from utils.helper import is_dev, not_static, get_local_ip, authz_required

# get the host and port
APP_ENV  = os.getenv("APP_ENV", "DEV")
APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT = os.getenv("APP_PORT", 8080)
APP_CORS = os.getenv("APP_CORS", f"http://localhost:{APP_PORT}")
APP_LOG_DIR = os.getenv("APP_LOG_DIR", "logs")

# init API endpoints
def _init_endpoints(app):
  # index endpoint
  # app.add_url_rule("/", "index", view_func=lambda: app.send_static_file("home.html"))
  @app.route('/')
  @app.route('/home.html')
  @authz_required
  def index():
    id_info = session['id_info']
    return render_template("home_tpl.html", 
      name=id_info["name"], email=id_info["email"], picture=id_info["picture"])
  
  # oauth2 endpoins
  app.add_url_rule("/authorize", "authorize", view_func=gcp.authorize)
  app.add_url_rule("/oauth2callback", "oauth2callback", view_func=gcp.oauth2_callback)
  app.add_url_rule("/revoke", "revoke", view_func=gcp.revoke)
  
  # deploy endpoints
  app.add_url_rule("/deploy/projects", "getProjects", methods=["GET"], view_func=rest.getProjects)
  app.add_url_rule("/deploy/projects/<project>/regions", "getRegions", methods=["GET"], view_func=rest.getRegions)
  app.add_url_rule("/deploy/projects/<project>/regions/<region>/demos/<id>", "deploy", methods=["POST"], view_func=rest.deploy)
  
  # demo endpoints
  app.add_url_rule("/demos", "getDemoList", methods=["GET"], view_func=rest.getDemoList)
  app.add_url_rule("/demos/<id>", "getDemo", methods=["GET"], view_func=rest.getDemo)
  app.add_url_rule("/demos", "createDemo", methods=["POST"], view_func=rest.createDemo)
  app.add_url_rule("/demos/<id>", "updateDemo", methods=["PUT"], view_func=rest.updateDemo)
  app.add_url_rule("/demos/<id>", "deleteDemo", methods=["DELETE"], view_func=rest.deleteDemo)
  
###########################################################
# the app factory function
######
def create_app():
  # config file
  config_file = "config/settings.json"
  if is_dev():
    config_file = "config/settings-local.json"
  
  # Create Flask app
  app = Flask(__name__, static_url_path="/", static_folder="static")
  app.config.from_file(config_file, load=json.load)

  # setup logging
  if not os.path.exists(APP_LOG_DIR):
    os.mkdir(APP_LOG_DIR)
  logger.init(app)
  
  # init endpoints
  _init_endpoints(app)

  # run after the app starts
  with app.app_context():
    # cache the db connection pool
    app.db_conn_pool = sql.get_db_conn_pool()
    # seed the db tables
    sql.create_tables()
      
  # run before the first request
  @app.before_first_request
  def before_first_request():
    dummy = 1
    
  # log before every request
  @app.before_request
  def log_request():
    if request.full_path[-1] == "?": 
      request.full_path = request.full_path[:-1]
    if not_static(request.full_path):
      app.logger.info(
        "%s %s %s %s %s",
        request.environ.get("SERVER_PROTOCOL"),
        request.remote_addr,
        request.method,
        request.full_path,
        request.get_data(as_text=True)
      )
    # CORS validate
    cors = f"{request.scheme}://{request.host}"
    if (cors != "*") and (cors not in APP_CORS):
      response_body = {
        "error": {
          "code": 403, 
          "message": f"The CORS Policy disallows reading the remote resource at {cors}."
        }
      }
      return make_response(response_body, 403)
    
  # log after every request
  @app.after_request
  def log_response(response):
      # response_body = json.dumps(response.get_json())
      # if (response_body == "null"):
      #   response_body = ""
      if not_static(request.full_path):
        app.logger.info(
            "%s %s %s %s %s",
            request.environ.get("SERVER_PROTOCOL"),
            request.remote_addr,
            request.method,
            request.full_path,
            response.status
            #,response_body
        )
      return response

  # catch all errors handler  
  @app.errorhandler(Exception)
  def handle_exception(e):
      app.logger.error("Exception occurred: ", exc_info=True)
      
      # pass through flask HTTP errors as json
      if isinstance(e, HTTPException):
          response = e.get_response()
          payload = json.dumps({
            "error" : {
              "code": e.code,
              "name": e.name,
              "message": e.description,
            }
          })
          response.data = f"{payload}"
          response.content_type = "application/json"
          return make_response(response, e.code)

      # now handle non-HTTP exceptions only
      response_body = {
        "error": {
          "code": 500, 
          "message": str(e)
        }
      }
      return make_response(response_body, 500)

  return app

def main():
  # When running locally, disable OAuthlib's HTTPs verification.
  os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

  # Supress raising the scope change error from oauthlib
  os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
  
  # create the app
  app = create_app()
  
  # display the IP and port info
  app.logger.info(f"App is running on http://{APP_HOST}:{APP_PORT}")
  app.logger.info(f"App is running on http://{get_local_ip()}:{APP_PORT}")

  if is_dev():
    app.run(
      threaded = True,
      host = APP_HOST, 
      port = APP_PORT, 
      # request_handler=logger.MyRequestHandler,
      debug = is_dev() 
    )
  else:
    # Use waitress for production deployment
    serve(app, host=APP_HOST, port=APP_PORT)
  
# start the application
if __name__ == "__main__":  
  main()