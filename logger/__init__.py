import os
import logging, logging.config, yaml
from werkzeug.serving import WSGIRequestHandler, _log


# create the logs folder if not present
logdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
if not os.path.exists(logdir):
  os.mkdir(logdir)

# init logging
def init(app):
    APP_ENV = os.getenv("FLASK_ENV", "DEV")
    app.config["APP_ENV"] = APP_ENV
    
    # set up logging through config file
    config = yaml.load(open("config/logging.yaml"), Loader=yaml.FullLoader)
    logging.config.dictConfig(config)
    logging.Logger.propagate = False
    # disable werkzeug logging
    # logging.getLogger("werkzeug").disabled = True

    app.logger.propagate = False
    file = logging.getLogger("file")
    console = logging.getLogger("console")
    
    # set the log level
    log_level = _get_log_level(os.getenv("FLASK_LOG_LEVEL"))
    file.setLevel(log_level)
    console.setLevel(log_level)
    
    # add the handlers to logger
    app.logger.addHandler(file)
    if (APP_ENV != "PROD"):
       app.logger.addHandler(console)
    
# get the log level
def _get_log_level(level):
    if level == "DEBUG":
        return logging.DEBUG
    if level == "INFO":
        return logging.INFO
    if level == "WARN":
        return logging.WARN
    if level == "ERROR":
        return logging.ERROR
    if level == "CRITICAL":
        return logging.CRITICAL
    return logging.DEBUG

class MyRequestHandler(WSGIRequestHandler):
    # Just like WSGIRequestHandler, but without "- -"
    def log(self, type, message, *args):
        _log(type, '%s %s\n' % (self.address_string(), message % args))

    # Just like WSGIRequestHandler, but without "code"
    def log_request(self, code='-', size='-'):
        self.log('info', '%s %s', self.requestline, code)
