import os
import json
import logging
from flask import Flask, jsonify, make_response, request
from werkzeug.exceptions import HTTPException

import logger
from oauth import gcp
from api import rest

# get the host and port
APP_HOST = os.getenv("FLASK_RUN_HOST", "0.0.0.0")
APP_PORT = os.getenv("FLASK_RUN_PORT", 8080)

# the app factory function
def create_app(config_file = "config/settings.json"):
  # Create Flask app
  app = Flask(__name__, static_url_path="/", static_folder="static")
  app.config.from_file(config_file, load=json.load)

  # setup logging
  logger.init(app)

  # index endpoint
  app.add_url_rule("/", "index", view_func=lambda: app.send_static_file("index.html"))
  # oauth2 endpoins
  app.add_url_rule("/authorize", "authorize", view_func=gcp.authorize)
  app.add_url_rule("/oauth2callback", "oauth2callback", view_func=gcp.oauth2_callback)
  app.add_url_rule("/revoke", "revoke", view_func=gcp.revoke)
  # deploy endpoint
  app.add_url_rule("/deploy/<project>/<location>", "deploy", methods=["GET", "POST"], view_func=rest.deploy)

  # run after the app starts
  with app.app_context():
    dummy = 1
      
  # run before the first request
  @app.before_first_request
  def disable_werkzeug_logging():
    logging.getLogger("werkzeug").disabled = True
    
  # log before every request
  @app.before_request
  def log_request():
    app.logger.info(
      "%s %s %s %s %s",
      request.environ.get("SERVER_PROTOCOL"),
      request.remote_addr,
      request.method,
      request.full_path,
      request.get_data(as_text=True)
    )
    
  # log after every request
  @app.after_request
  def log_response(response):
      response_body = json.dumps(response.get_json())
      if (response_body == "null"):
        response_body = ""
        
      app.logger.info(
          "%s %s %s %s %s %s",
          request.environ.get("SERVER_PROTOCOL"),
          request.remote_addr,
          request.method,
          request.full_path,
          response.status,
          response_body
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
          response.data = f"{payload}\n"
          response.content_type = "application/json"
          return make_response(response, e.code)

      # now handle non-HTTP exceptions only
      response_body = {
        "error": {
          "code": 500, 
          "message": "unhandled exception occurred", 
          "details": str(e)
        }
      }
      return make_response(response_body, 500)

  return app

def _main():
  # When running locally, disable OAuthlib's HTTPs verification.
  os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

  # Supress raising the scope change error from oauthlib
  os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
  
  # Use waitress for production deployment
  # from waitress import serve
  # serve(app, host="0.0.0.0", port=8080, _quiet=False)
  app = create_app()
  app.run(
    host=APP_HOST, 
    port=APP_PORT, 
    # request_handler=logger.MyRequestHandler, 
    debug=True
  )
  
if __name__ == "__main__":
  # start the app
  _main()