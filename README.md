# TAK Update Server
This is my own implementation of the TAK update protocol/server.
At the moment it only provides basic functionality like uploading plugins/apps and downloading them from the ATAK app.
Currently, only the ATAK application and plugins are supported.


### Installation
- Install requirements via `npm install`
- Build project via `npx tsc`
- Set the `ACCESS_TOKEN` environment variable with your management token. Bash example: `export ACCESS_TOKEN=16123123123`
- Run app via `node build/index.js`
- Upload plugins via `http://localhost:8019/manage?token=<your access token>`

### Usage

#### 1. Put in the URL
- Open menu `ATAK app > More icon > Plugins > More icon > Edit`
- Enable option `Update Server`
- Enter your server url into `Update Server URL`

#### 2. Generate PKCS12 keystore file
- Have a domain name (we're currently running `taktest.ascentapi.com`) and setup record with DNS service.
- Shell into cloud VM of choice, obtain certificates with `certbot`.
- Setup `Nginx` proxy and configure to use the certbot certifications.
- Export PKCS12 keystore:

```shell
openssl pkcs12 -export \
    -in /etc/letsencrypt/live/<yourdomain.com>/fullchain.pem \
    -inkey /etc/letsencrypt/live/<yourdomain.com>/privkey.pem \
    -out keystore.p12 \
    -name "<yourdomain.com>-cert" \
    -CAfile /etc/letsencrypt/live/<yourdomain.com>/chain.pem \
    -caname "Let's Encrypt Authority"
```
- You might have to change the folder access permissions, if it gives you trouble then do `sudo chmod +rw /etc/letsencrypt/live`.
- Once you see the `keystore.p12` file, give it read access and download it, make sure to set a passphrase when prompted.
- Download the file and transfer it to your android device.
- Install the certificate by opening it and input the passphrase.
- Open TAK, go to where you set up the update server URL, you should see a `PKCS12 TrustStore Location` and `PKCS12 TrustStore Password`, input the keystore location and passphrase respectively.
- Click sync, it should work (as long as the update server is up and running).