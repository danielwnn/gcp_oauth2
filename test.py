from netifaces import interfaces, ifaddresses, AF_INET

for ifaceName in interfaces():
    address = [i['addr'] for i in ifaddresses(ifaceName).setdefault(AF_INET, [{'addr':'None'}])]
    if (address[0] != 'None' and address[0] != '127.0.0.1'):
        print(address[0])
