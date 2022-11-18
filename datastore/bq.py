from google.cloud import bigquery
from flask import current_app as app, session
from google.oauth2.credentials import Credentials

from utils.helper import is_dev

# create BQ client
def get_bq_client():
  # check if cached
  if ('bq_client' in app):
    return app.bq_client
  
  project_id = app.config["PROJECT_ID"]
  if is_dev() and 'credentials' in session:
    credentials = Credentials(**session['credentials'])
    return bigquery.Client(project=project_id, credentials=credentials)
  else:
    return bigquery.Client(project=project_id)
  
# make BigQuery call
def call_bigQuery(query_string, func):
  job = get_bq_client().query(query_string)
  result = job.result()
  if (func):
    return func(result)

# Get the demo list
def getDemoList():  
  query_string = "SELECT id, name, contact, description, repository_url, deploy_url, undeploy_url, tags FROM gcp_demo.inventory WHERE status = 'ACTIVE'"
  app.logger.debug(query_string)
  
  job = get_bq_client().query(query_string)
  results = job.result()
  
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

# Get the demo
def getDemo(id):
  query_string = f"SELECT id, name, contact, description, repository_url, deploy_url, undeploy_url, tags FROM gcp_demo.inventory WHERE id = '{id}'"
  app.logger.debug(query_string)
  
  job = get_bq_client().query(query_string)
  results = job.result()
  
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

# Create the demo
def createDemo(data):
  query_string = f"""INSERT gcp_demo.inventory (id, name, contact, description, repository_url, deploy_url, undeploy_url, status, time_stamp) 
    VALUES ('{data["id"]}', '{data["name"]}', '{data["contact"]}', '{data["description"]}', '{data["repository_url"]}', '{data["deploy_url"]}', '{data["undeploy_url"]}', 'ACTIVE', CURRENT_TIMESTAMP())"""
  app.logger.debug(query_string)
  job = get_bq_client().query(query_string)
  job.result()

# Update the demo
def updateDemo(data):
  query_string = f"""UPDATE gcp_demo.inventory SET name='{data["name"]}', contact='{data["contact"]}', description='{data["description"]}', 
    repository_url='{data["repository_url"]}', deploy_url='{data["deploy_url"]}', undeploy_url='{data["undeploy_url"]}' WHERE id='{data["id"]}'"""
  app.logger.debug(query_string)
  job = get_bq_client().query(query_string)
  job.result()

# Delete the demo
def deleteDemo(id):
  query_string = f"UPDATE gcp_demo.inventory SET status='DELETED' WHERE id='{id}'"
  app.logger.debug(query_string)
  job = get_bq_client().query(query_string)
  job.result()
  
    