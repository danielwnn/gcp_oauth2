import yaml
import json
import requests
from flask import current_app as app, request

from utils.helper import makeHttpRequest, makeBigQueryCall

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
  
  # hard-coded the sample url for now
  file_url = "https://raw.githubusercontent.com/danielwnn/FaceRecognition/main/cloudbuild.yaml"
  file_req = requests.get(file_url)
  yaml_obj = yaml.safe_load(file_req.text)
  payload = json.dumps(yaml_obj)
  
  return makeHttpRequest(endpoint, "POST", None, payload, None)

# Create a Cloud Build job
def _create_build_job(credentials, file_url, project, region):
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

# Get the demo list
def getDemoList():
  # local function
  def func(results):
    demolist = {"demos":[]}
    for row in results:
      demolist["demos"].append({
        "id": row["id"],
        "name": row["name"],
        "contact": row["contact"],
        "description": row["description"],
        "repository_url": row["repository_url"],
        "deploy_url": row["deploy_url"],
        "undeploy_url": row["undeploy_url"],
        "tags": row["tags"]
      })
    return demolist
  
  query_string = "SELECT id, name, contact, description, repository_url, deploy_url, undeploy_url, tags FROM gcp_demo.inventory WHERE status = 'ACTIVE'"
  app.logger.debug(query_string)
  return makeBigQueryCall(query_string, func)

# Get the demo
def getDemo(id):
  # local function
  def func(results):
    demo = {}
    for row in results:
      demo = {
        "id": row["id"],
        "name": row["name"],
        "contact": row["contact"],
        "description": row["description"],
        "repository_url": row["repository_url"],
        "deploy_url": row["deploy_url"],
        "undeploy_url": row["undeploy_url"],
        "tags": row["tags"]
      }
    return demo
  
  query_string = f"SELECT id, name, contact, description, repository_url, deploy_url, undeploy_url, tags FROM gcp_demo.inventory WHERE id = '{id}'"
  app.logger.debug(query_string)
  return makeBigQueryCall(query_string, func)

# Create the demo
def createDemo():
  data = request.json
  query_string = f"""INSERT gcp_demo.inventory (id, name, contact, description, repository_url, deploy_url, undeploy_url, status, time_stamp) 
    VALUES ('{data["id"]}', '{data["name"]}', '{data["contact"]}', '{data["description"]}', '{data["repository_url"]}', '{data["deploy_url"]}', '{data["undeploy_url"]}', 'ACTIVE', CURRENT_TIMESTAMP())"""
  app.logger.debug(query_string)
  return makeBigQueryCall(query_string, None)

# Update the demo
def updateDemo(id):
  data = request.json
  query_string = f"""UPDATE gcp_demo.inventory SET name='{data["name"]}', contact='{data["contact"]}', description='{data["description"]}', 
    repository_url='{data["repository_url"]}', deploy_url='{data["deploy_url"]}', undeploy_url='{data["undeploy_url"]}' WHERE id='{id}'"""
  app.logger.debug(query_string)
  return makeBigQueryCall(query_string, None)

# Delete the demo
def deleteDemo(id):
  query_string = f"UPDATE gcp_demo.inventory SET status='DELETED' WHERE id='{id}'"
  app.logger.debug(query_string)
  return makeBigQueryCall(query_string, None)