import yaml
import json
import flask
import requests
from flask import current_app as app, request, session

from google.oauth2.credentials import Credentials
# from google.cloud import resourcemanager_v3
# from google.api_core.exceptions import Unauthenticated

# API endpoints
_PROJECTS_ENDPOINT = "https://cloudresourcemanager.googleapis.com/v1/projects?filter=name:*danielw*"
_REGIONS_ENDPOINT = "https://compute.googleapis.com/compute/v1/projects/{project}/regions"
_BUILD_ENDPOINT = "https://cloudbuild.googleapis.com/v1/projects/{project}/builds"

# 401 response
_HTTP_401 = ({"error": {"code": 401, "message": "Unauthenticated."}}, 401)

# fetch the projects
def getProjects():
  # save the full request path
  session['req_full_path'] = request.full_path
  
  # check if user session is present
  if ('credentials' in session):
    # Load credentials from the session.
    credentials = Credentials(**session['credentials'])
    
    # search for projects
    headers = {
      "Authorization": f"Bearer {credentials.token}", 
      "Content-Type": "application/json"
    }
    response = requests.get(_PROJECTS_ENDPOINT, headers=headers)
    result, status_code = response.json(), response.status_code
    
    if status_code != 401:
      return result, status_code

  return _HTTP_401


# fetch the regions
def getRegions(project):
  # save the full request path
  session['req_full_path'] = request.full_path
  
  # API endpoint
  endpoint = _REGIONS_ENDPOINT.replace("{project}", project)
  
  # check if user session is present
  if ('credentials' in session):
    # Load credentials from the session.
    credentials = Credentials(**session['credentials'])
    
    # search for projects
    headers = {
      "Authorization": f"Bearer {credentials.token}", 
      "Content-Type": "application/json"
    }
    response = requests.get(endpoint, headers=headers)
    result, status_code = response.json(), response.status_code
    
    if status_code != 401:
      if status_code == 200:
        regions = {"regions": []}
        for item in result["items"]:
          regions["regions"].append(item["name"])
        result = regions
      return result, status_code 

  # not authenticated or 401 response
  return _HTTP_401


# deploy the demo
def deploy(project, region, id):
  # save the full request path
  session['req_full_path'] = request.full_path
  
  # check if user session is present
  if ('credentials' in session):
    # Load credentials from the session.
    credentials = Credentials(**session['credentials'])
    
    # hard-coded the sample url for now
    file_url = "https://raw.githubusercontent.com/danielwnn/FaceRecognition/main/cloudbuild.yaml"
  
    # create the cloud build job
    result, status_code = _create_build_job(credentials, file_url, project, region)
  
    # oauth timeout, need to re-authz
    if status_code == 401 and flask.request.method == "GET":
      return flask.redirect('/authorize')
  
    return result, status_code # flask.jsonify(flask.session['id_info'])
  else: 
    # not authenticated yet
    if request.method == "GET":
      return flask.redirect('/authorize')
    else:
      # POST through AJAX
      return _HTTP_401

# Create a Cloud Build job
def _create_build_job(credentials, file_url, project, region):
  # PROJECT_ID = app.config["PROJECT_ID"]
  endpoint = _BUILD_ENDPOINT.replace("{project}", project)
  
  # CLOUD_BUILD_YAML = app.config["CLOUD_BUILD_YAML"]
  # with open(CLOUD_BUILD_YAML, 'r') as yaml_in:
  #   yaml_obj = yaml.safe_load(yaml_in)
  #   data = json.dumps(yaml_obj)

  # fetch the yaml file from Github
  file_req = requests.get(file_url)
  yaml_obj = yaml.safe_load(file_req.text)
  data = json.dumps(yaml_obj)
  
  headers = {
    "Authorization": f"Bearer {credentials.token}", 
    "Content-Type": "application/json"
  }
  response = requests.post(endpoint, headers=headers, data=data)
  return response.json(), response.status_code


