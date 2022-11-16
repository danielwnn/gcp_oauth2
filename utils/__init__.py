import requests
from functools import wraps
from flask import current_app as app, request, session, redirect, url_for 
from google.oauth2.credentials import Credentials
from netifaces import interfaces, ifaddresses, AF_INET

# 401 response
_HTTP_401 = ({"error": {"code": 401, "message": "Unauthenticated."}}, 401)

# get local IP addresses
def get_local_ip():
  for ifaceName in interfaces():
    address = [i['addr'] for i in ifaddresses(ifaceName).setdefault(AF_INET, [{'addr':'None'}])]
    if (address[0] != 'None' and address[0] != '127.0.0.1'):
      return address[0]
  return '127.0.0.1'

# helper to make http request
def makeHttpRequest(endpoint, method, headers, payload, func):
  app.logger.debug(f"request url -> {request.url}")
  app.logger.debug(f"request full_path -> {request.full_path}")
  
  # save the full request path
  session['req_full_path'] = request.full_path
  
  # check if user session is present
  if ('credentials' in session):
    # Load credentials from the session.
    credentials = Credentials(**session['credentials'])
    
    if (headers):
      headers["Authorization"] = f"Bearer {credentials.token}"
      headers["Content-Type"] = "application/json"
    else:
      headers = {
        "Authorization": f"Bearer {credentials.token}", 
        "Content-Type": "application/json"
      }
    
    response = None
    if method == "GET":
      response = requests.get(endpoint, headers=headers, data=payload)
    elif method == "POST":
      response = requests.post(endpoint, headers=headers, data=payload)
    elif method == "DELETE":
      response = requests.delete(endpoint, headers=headers, data=payload)
    
    result, status_code = response.json(), response.status_code
    
    if status_code != 401:
      if status_code == 200 and func:
        result = func(response.json())
      return result, status_code

  return _HTTP_401

# decorator role_required
def role_required(role):
  def decorator(func):
    @wraps(func)
    def authorize(*args, **kwargs):
      if 'id_info' not in session:
        return _HTTP_401
      id_info = session['id_info']
      if role not in id_info['email']:
        return _HTTP_401
      return func(*args, **kwargs)
    return authorize
  return decorator

# decorator authz_required
def authz_required(func):
    @wraps(func)
    def secure_function(*args, **kwargs):
        if 'credentials' not in session:
            return redirect(url_for("authorize", next=request.url))
        return func(*args, **kwargs)
    return secure_function

  # flask.jsonify(session['id_info'])