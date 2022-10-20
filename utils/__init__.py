from netifaces import interfaces, ifaddresses, AF_INET

# get local IP addresses
def get_local_ip():
    for ifaceName in interfaces():
        address = [i['addr'] for i in ifaddresses(ifaceName).setdefault(AF_INET, [{'addr':'None'}])]
        if (address[0] != 'None' and address[0] != '127.0.0.1'):
            return address[0]
    return '127.0.0.1'
