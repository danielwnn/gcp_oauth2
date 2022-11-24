class ReverseProxied(object):
  """
  Because we are reverse proxied from an aws load balancer
  use environ/config to signal https
  since flask ignores preferred_url_scheme in url_for calls
  """
  def __init__(self, app, preferred_scheme):
      self.app = app
      self.preferred_scheme = preferred_scheme

  def __call__(self, environ, start_response):
      # if one of x_forwarded or preferred_url is https, prefer it.
      forwarded_scheme = environ.get("HTTP_X_FORWARDED_PROTO", None)
      if "https" in [forwarded_scheme, self.preferred_scheme]:
          environ["wsgi.url_scheme"] = "https"
      return self.app(environ, start_response)