import os
import logging, logging.config, yaml
from werkzeug.serving import WSGIRequestHandler, _log

# init logging
def init(app, config_file):
    APP_ENV = os.getenv("APP_ENV", "DEV")
    app.config["APP_ENV"] = APP_ENV
    
    # disable logging for werkzeug
    logging.getLogger("werkzeug").disabled = True
    
    # set up logging through config file
    config = yaml.load(open(config_file), Loader=yaml.FullLoader)
    logging.config.dictConfig(config)

    # disable logging propagation
    app.logger.propagate = False
    file = logging.getLogger("file")
    console = logging.getLogger("console")
    waitress = logging.getLogger("waitress")
    
    # set the log level
    APP_LOG_LEVEL = os.getenv("APP_LOG_LEVEL", "DEBUG")
    log_level = _get_log_level(APP_LOG_LEVEL)
    file.setLevel(log_level)
    console.setLevel(log_level)
    waitress.setLevel(log_level)
    
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
    return logging.INFO

class MyRequestHandler(WSGIRequestHandler):
    # Just like WSGIRequestHandler, but without "- -"
    def log(self, type, message, *args):
        _log(type, '%s %s\n' % (self.address_string(), message % args))

    # Just like WSGIRequestHandler, but without "code"
    def log_request(self, code='-', size='-'):
        self.log('info', '%s %s', self.requestline, code)
