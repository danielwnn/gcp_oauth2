import yaml
import json
import flask
import requests
from flask import current_app as app, request, session

from google.oauth2.credentials import Credentials
from google.api_core.exceptions import Unauthenticated

# deploy the demo
def deploy(project, location):
  # save the full request path
  session['req_full_path'] = request.full_path
  
  # check if user session is present
  if ('credentials' in session):
    # Load credentials from the session.
    credentials = Credentials(**session['credentials'])
  
    # create the cloud build job
    result, status_code = _create_build_job(credentials, project, location)
  
    if status_code == 401 and flask.request.method == "GET":
      return flask.redirect('/authorize')
  
    return result, status_code # flask.jsonify(flask.session['id_info'])
  else: 
    if request.method == "GET":
      return flask.redirect('/authorize')
    else:
      # POST through AJAX
      return {"error": {"code": 401, "message": "Unauthenticated."}}, 401

# Create a Cloud Build job
def _create_build_job(credentials, project, location):
  PROJECT_ID = app.config["PROJECT_ID"]
  endpoint = f"https://cloudbuild.googleapis.com/v1/projects/{PROJECT_ID}/builds"
  
  CLOUD_BUILD_YAML = app.config["CLOUD_BUILD_YAML"]
  with open(CLOUD_BUILD_YAML, 'r') as yaml_in:
    yaml_obj = yaml.safe_load(yaml_in)
    data = json.dumps(yaml_obj)

  headers = {
    "Authorization": f"Bearer {credentials.token}", 
    "Content-Type": "application/json"
  }
  
  response = requests.post(endpoint, headers=headers, data=data)
  return response.json(), response.status_code


  