import yaml
import json
import requests
from flask import current_app as app, request, session

# from google.oauth2.credentials import Credentials
# from google.cloud import resourcemanager_v3
# from google.api_core.exceptions import Unauthenticated

from utils import makeHttpRequest

# API endpoints
_PROJECTS_ENDPOINT = "https://cloudresourcemanager.googleapis.com/v1/projects?filter=name:*danielw*"
_REGIONS_ENDPOINT = "https://compute.googleapis.com/compute/v1/projects/{project}/regions"
_BUILD_ENDPOINT = "https://cloudbuild.googleapis.com/v1/projects/{project}/builds"

# fetch the projects
def getProjects():
  return makeHttpRequest(_PROJECTS_ENDPOINT, "GET", None, None, None)

# fetch the regions
def getRegions(project):
  # API endpoint
  endpoint = _REGIONS_ENDPOINT.replace("{project}", project)
  
  # local function
  def func(result):
    regions = {"regions": []}
    for item in result["items"]:
      regions["regions"].append(item["name"])
    return regions
  
  return makeHttpRequest(endpoint, "GET", None, None, func)

# deploy the demo
def deploy(project, region, id):  
  endpoint = _BUILD_ENDPOINT.replace("{project}", project)
  
  # hard-coded the sample url for now
  file_url = "https://raw.githubusercontent.com/danielwnn/FaceRecognition/main/cloudbuild.yaml"
  file_req = requests.get(file_url)
  yaml_obj = yaml.safe_load(file_req.text)
  payload = json.dumps(yaml_obj)
  
  return makeHttpRequest(endpoint, "POST", None, payload, None)

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


