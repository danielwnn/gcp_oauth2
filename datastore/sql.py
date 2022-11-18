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
        email VARCHAR(128),
        project_id VARCHAR(128),
        region VARCHAR(128),
        log_url VARCHAR(256),
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
def create_tables(connection):
  with connection:
    with connection.cursor() as cursor:
        for query in _queries:
            cursor.execute(query)

# execute SQL query
def exec_sql(query_string, func):       
  pool = app.db_conn_pool
  with pool.connection() as db:
    with db.cursor() as cursor:
      cursor.execute(query_string)
      result = cursor.fetchall()
      if (func):
        return func(result)

# Get the demo list
def getDemoList():
  
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
    
  query_string = "SELECT id, name, contact, description, repository_url, deploy_url, undeploy_url, tags FROM inventory WHERE status = 'ACTIVE'"
  app.logger.debug(query_string)
  
  return exec_sql(query_string, func)

# Get the demo
def getDemo(id):

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
  
  query_string = f"SELECT id, name, contact, description, repository_url, deploy_url, undeploy_url, tags FROM inventory WHERE id = '{id}'"
  app.logger.debug(query_string)
  
  return exec_sql(query_string, func)

# Create the demo
def createDemo(data):
  query_string = f"""INSERT inventory (id, name, contact, description, repository_url, deploy_url, undeploy_url) VALUES ('{data["id"]}', '{data["name"]}', '{data["contact"]}', '{data["description"]}', '{data["repository_url"]}', '{data["deploy_url"]}', '{data["undeploy_url"]}')"""
  app.logger.debug(query_string)
  return exec_sql(query_string, None)

# Update the demo
def updateDemo(id, data):
  query_string = f"""UPDATE inventory SET name='{data["name"]}', contact='{data["contact"]}', description='{data["description"]}', repository_url='{data["repository_url"]}', deploy_url='{data["deploy_url"]}', undeploy_url='{data["undeploy_url"]}' WHERE id='{id}'"""
  app.logger.debug(query_string)
  return exec_sql(query_string, None)

# Delete the demo
def deleteDemo(id):
  query_string = f"UPDATE inventory SET status='DELETED' WHERE id='{id}'"
  app.logger.debug(query_string)
  return exec_sql(query_string, None)

# New Deployment
def createDeployment(data):
  query_string = f"""INSERT deployment (id, email, project_id, region, log_url) VALUES ('{data["id"]}', '{data["email"]}', '{data["project_id"]}', '{data["region"]}', '{data["log_url"]}')"""
  app.logger.debug(query_string)
  return exec_sql(query_string, None)

    