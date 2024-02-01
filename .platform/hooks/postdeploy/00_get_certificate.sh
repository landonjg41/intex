#!/usr/bin/env bash
# Place in .platform/hooks/postdeploy directory
sudo certbot -n -d mentalhealth.provo.is404.net --nginx --agree-tos --email landonjg41@gmail.com
#sudo certbot -n -d bsomt-intex-test.us-east-1.elasticbeanstalk.com --nginx --agree-tos --email landonjg41@gmail.com