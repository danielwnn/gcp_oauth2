import flask
import requests
from flask import current_app as app

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.oauth2 import id_token
from google.auth.transport.requests import Request

# private function
def _credentials_to_dict(credentials):
  return {
    'token': credentials.token,
    'refresh_token': credentials.refresh_token,
    'token_uri': credentials.token_uri,
    'client_id': credentials.client_id,
    'client_secret': credentials.client_secret,
    'scopes': credentials.scopes
  }

# Verify id_token and id info
def _verify_oauth2_token(credentials):
  token, audience = credentials.id_token, credentials.client_id
  id_info = id_token.verify_oauth2_token(token, Request(), audience)
  return id_info

# revoke the user credentials
def revoke():
  if 'credentials' in flask.session:
    credentials = Credentials(**flask.session['credentials'])

    # call API to revoke 
    response = requests.post(
        'https://oauth2.googleapis.com/revoke',
        params={'token': credentials.token},
        headers = {'content-type': 'application/x-www-form-urlencoded'}
      )
    result, status_code = response.json(), response.status_code
    # return result, status_code
  # else:
  #   return {'code': 200, 'message': 'Not authenticated, nothing to revoke.'}, 200
  
  # clear session
  flask.session.clear()
  
  # redirect to the homepage
  return flask.redirect("/")
  

# oauth2 user consent flow
def authorize():
  CLIENT_SECRETS_FILE = app.config["CLIENT_SECRETS_FILE"]
  SCOPES = app.config["SCOPES"]
  
  # Create flow instance to manage the OAuth 2.0 Authorization Grant Flow steps.
  flow = Flow.from_client_secrets_file(CLIENT_SECRETS_FILE, scopes=SCOPES)

  # The URI created here must exactly match one of the authorized redirect URIs
  # for the OAuth 2.0 client, which you configured in the API Console. If this
  # value doesn't match an authorized URI, you will get a 'redirect_uri_mismatch'
  # error.
  flow.redirect_uri = flask.url_for('oauth2callback', _external=True)

  authorization_url, state = flow.authorization_url(
      # Enable offline access so that you can refresh an access token without
      # re-prompting the user for permission. Recommended for web server apps.
      access_type='offline',
      # Ask the user to consent
      prompt='consent',
      # Enable incremental authorization. Recommended as a best practice.
      include_granted_scopes='true')

  # Store the state so the callback can verify the auth server response.
  flask.session['state'] = state

  # app.logger.debug(f"authorize_url - {authorization_url}")
  return flask.redirect(authorization_url)

# oauth2 callback
def oauth2_callback():
  CLIENT_SECRETS_FILE = app.config["CLIENT_SECRETS_FILE"]
  SCOPES = app.config["SCOPES"]
  
  # Specify the state when creating the flow in the callback so that it can
  # verified in the authorization server response.
  state = flask.session['state']

  flow = Flow.from_client_secrets_file(CLIENT_SECRETS_FILE, scopes=SCOPES, state=state)
  flow.redirect_uri = flask.url_for('oauth2callback', _external=True)

  # Use the authorization server's response to fetch the OAuth 2.0 tokens
  flow.fetch_token(authorization_response=flask.request.url)
  # app.logger.debug(f"oauth2_callback_url - {flask.request.url}")
  
  # Store credentials in the session.
  # ACTION ITEM: In a production app, you likely want to save these
  #              credentials in a persistent database instead.
  credentials = flow.credentials
  flask.session['id_info'] = _verify_oauth2_token(credentials)
  flask.session['credentials'] = _credentials_to_dict(credentials)

  # url = flask.url_for('index') + '#' + flask.session['req_full_path']
  url = '/popup.html#' + flask.session['req_full_path']
  app.logger.debug(f"callback_redirect_url - {url}")
  return flask.redirect(url)

