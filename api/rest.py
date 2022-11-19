import yaml
import json
import requests
from flask import current_app as app, request

from utils.helper import makeHttpRequest, get_user_email, role_required, HTTP_200
from datastore import sql

# flask.jsonify(session['id_info'])

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
  
  # CLOUD_BUILD_YAML = app.config["CLOUD_BUILD_YAML"]
  # with open(CLOUD_BUILD_YAML, 'r') as yaml_in:
  #   yaml_obj = yaml.safe_load(yaml_in)
  #   data = json.dumps(yaml_obj)
  
  demo = sql.getDemo(id)
  file_url = demo["deploy_url"]
  yaml_text = requests.get(file_url).text
  yaml_text = yaml_text.replace("$REGION", region)
  yaml_obj = yaml.safe_load(yaml_text)
  payload = json.dumps(yaml_obj)
  
  result, status_code = makeHttpRequest(endpoint, "POST", None, payload, None)
  if (status_code == 200):
    data = {
      "id": (request.json)["deploy_id"],
      "demo_id": id,
      "project_id": project,
      "region": region,
      "email": get_user_email(),
      "log_url": result["metadata"]["build"]["logUrl"]
    }
    sql.createDeployment(data)
  
  return result, status_code

# Get the demo list
def getDemoList():
  return sql.getDemoList(), 200

# Get the demo
def getDemo(id):
  return sql.getDemo(id), 200

# Create the demo
@role_required("@google.com")
def createDemo():
  sql.createDemo(request.json)
  return HTTP_200

# Update the demo
@role_required("@google.com")
def updateDemo(id):
  sql.updateDemo(id, request.json)
  return HTTP_200

# Delete the demo
@role_required("@google.com")
def deleteDemo(id):
  sql.deleteDemo(id)
  return HTTP_200