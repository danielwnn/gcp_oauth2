import pymysql
import pymysql.cursors
from dbutils.pooled_db import PooledDB
from flask import current_app as app

# pymysql.install_as_MySQLdb()

_queries = [
    """CREATE TABLE IF NOT EXISTS inventory (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(256),
        contact VARCHAR(256),
        description TEXT,
        repository_url VARCHAR(256),
        deploy_url VARCHAR(256),
        undeploy_url VARCHAR(256),
        tags VARCHAR(256),
        status VARCHAR(256) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=INNODB;""",
    """CREATE TABLE IF NOT EXISTS deployment (
        id VARCHAR(36),
        demo_id VARCHAR(36),
        email VARCHAR(128),
        project_id VARCHAR(128),
        region VARCHAR(128),
        log_url VARCHAR(256),
        status VARCHAR(16),
        deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=INNODB;""",
    """CREATE TABLE IF NOT EXISTS rating (
        id VARCHAR(36),
        email VARCHAR(128),
        score TINYINT,
        rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=INNODB;""",
    """CREATE TABLE IF NOT EXISTS comment (
        id VARCHAR(36),
        email VARCHAR(128),
        comment TEXT,
        commented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=INNODB;"""
]

# creat db connection pool
def get_db_conn_pool():
  if hasattr(app, 'db_conn_pool'):
    return app.db_conn_pool
  return PooledDB(
    pymysql, 
    autocommit=True,
    mincached=1,
    maxcached=app.config['CLOUDSQL']['MAXCACHED'],
    host=app.config['CLOUDSQL']['HOST'],
    user=app.config['CLOUDSQL']['USER'],
    password=app.config['CLOUDSQL']['PASSWORD'],
    database=app.config['CLOUDSQL']['DATABASE'],
    cursorclass=pymysql.cursors.DictCursor
  )

# create the tables
def create_tables():
  pool = get_db_conn_pool()
  with pool.connection() as db:
    with db.cursor() as cursor:
        for query in _queries:
            cursor.execute(query)

# execute SQL query
def _exec_sql(query_string, data, func):       
  pool = get_db_conn_pool()
  with pool.connection() as db:
    with db.cursor() as cursor:
      cursor.execute(query_string, data)
      result = cursor.fetchall()
      if (func):
        return func(result)

# Get the demo list
def getDemoList():
  # inner function
  def func(result):
    demolist = {"demos":[]}
    for row in result:
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
    
  query = "SELECT id, name, contact, description, repository_url, deploy_url, undeploy_url, tags FROM inventory WHERE status = 'ACTIVE'"
  app.logger.debug(query)
  return _exec_sql(query, None, func)

# Get the demo
def getDemo(id):
  # inner function
  def func(result):
    demo = {}
    for row in result:
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
  
  # query = f"""SELECT id, name, contact, description, repository_url, deploy_url, undeploy_url, tags FROM inventory WHERE id = '{id}'"""
  query = """SELECT id, name, contact, description, repository_url, deploy_url, undeploy_url, tags FROM inventory WHERE id = %s"""
  data = (id)
  app.logger.debug(query, data)
  return _exec_sql(query, data, func)

# Create the demo
def createDemo(demo):
  # query = f"""INSERT inventory (id, name, contact, description, repository_url, deploy_url, undeploy_url) VALUES ('{demo["id"]}', '{demo["name"]}', '{demo["contact"]}', '{demo["description"]}', '{demo["repository_url"]}', '{demo["deploy_url"]}', '{demo["undeploy_url"]}')"""
  query = """INSERT inventory (id, name, contact, description, repository_url, deploy_url, undeploy_url) VALUES (%s, %s, %s, %s, %s, %s, %s)"""
  data = (demo["id"], demo["name"], demo["contact"], demo["description"], demo["repository_url"], demo["deploy_url"], demo["undeploy_url"])
  app.logger.debug(query, *data)
  return _exec_sql(query, data, None)

# Update the demo
def updateDemo(id, demo):
  # query = f"""UPDATE inventory SET name='{demo["name"]}', contact='{demo["contact"]}', description='{demo["description"]}', repository_url='{demo["repository_url"]}', deploy_url='{demo["deploy_url"]}', undeploy_url='{demo["undeploy_url"]}' WHERE id='{id}'"""
  query = """UPDATE inventory SET name=%s, contact=%s, description=%s, repository_url=%s, deploy_url=%s, undeploy_url=%s WHERE id=%s"""
  data = (demo["name"], demo["contact"], demo["description"], demo["repository_url"], demo["deploy_url"], demo["undeploy_url"], id)
  app.logger.debug(query, *data)
  return _exec_sql(query, data, None)

# Delete the demo
def deleteDemo(id):
  # query = f"UPDATE inventory SET status='DELETED' WHERE id='{id}'"
  query = """UPDATE inventory SET status='DELETED' WHERE id=%s"""
  data = (id)
  app.logger.debug(query, data)
  return _exec_sql(query, data, None)

# New Deployment
def createDeployment(deployment):
  # query = f"""INSERT deployment (id, demo_id, email, project_id, region, log_url, status) VALUES ('{deployment["id"]}', '{deployment["demo_id"]}', '{deployment["email"]}', '{deployment["project_id"]}', '{deployment["region"]}', '{deployment["log_url"]}', '{deployment["status"]}')"""
  query = """INSERT deployment (id, demo_id, email, project_id, region, log_url, status) VALUES (%s, %s, %s, %s, %s, %s, %s)"""
  data = (deployment["id"], deployment["demo_id"], deployment["email"], deployment["project_id"], deployment["region"], deployment["log_url"], deployment["status"]) 
  app.logger.debug(query, *data)
  return _exec_sql(query, data, None)

# Get the deployment list
def getDeployments(email):
  # inner function
  def func(result):
    data = {"demos":[]}
    for row in result:
      deployment = {
        "id": row["id"],
        "project_id": row["project_id"],
        "region": row["region"],
        "log_url": row["log_url"],
        "status": row["status"],
        "deployed_at": row["deployed_at"]
      }
      found = False
      for demo in data["demos"]:
        if demo["demo_id"] == row["demo_id"]:
          found = True
          demo["deployments"].append(deployment)
      if not found:
        # not in the list, add it 
        data["demos"].append({
          "demo_id": row["demo_id"],
          "name": row["name"],
          "description": row["description"],
          "undeploy_url": row["undeploy_url"],
          "deployments": [deployment]
        })
    return data
    
  query = f"""SELECT d.id, d.project_id, d.region, d.log_url, d.status, DATE_FORMAT(d.deployed_at, '%m/%e/%Y, %h:%i:%s %p') as deployed_at, d.demo_id, n.name, n.description, n.undeploy_url FROM inventory n, deployment d WHERE d.demo_id=n.id and d.email='{email}'"""
  app.logger.debug(query)
  return _exec_sql(query, None, func)