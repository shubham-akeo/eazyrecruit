#!/bin/bash

db_up(){
  sudo docker-compose up -d mongodb ez_elastic
}

ez_docker_up(){
    sudo docker-compose up --build -d ez_web_build 
    sleep 1
    sudo docker cp ez_web_build:/usr/src/core/admin ./core
    sleep 1
    sudo docker-compose up --build -d nginx ez_engine ez_web
}

setup(){
    if [ ! -d elastic_search_data ]; then
      mkdir elastic_search_data
    fi

    if [ ! -d elastic_search_db ]; then
      mkdir elastic_search_db
    fi

    db_up

    echo "########## Wait few min, Setting MongoDb and Elastic Search Dockers #########################"
    mongodb_status_check=`sudo docker logs ez_mongodb | grep "MongoDB init process complete;"`
    # echo $mongodb_status_check
    while [ -z "$mongodb_status_check" ]
    do
        sleep 40
        echo "Waiting for mongodb docker to be running"
        mongodb_status_check=`sudo docker logs ez_mongodb | grep "MongoDB init process complete;"`
        # echo $mongodb_status_check
    done

    echo "########## Wait few sec, Setting core and engine services #######################"
    sleep 10

    ez_docker_up

    admin_user_create_check=`sudo docker logs ez_web | grep "Admin Password:"`
    #echo $admin_user_create_check
    while [ -z "$admin_user_create_check" ]
    do
        sleep 1
        echo "Waiting for admin user creation"
        admin_user_create_check=`sudo docker logs ez_web | grep "Admin Password:"`
        echo $admin_user_create_check > .adminpass
        # echo $admin_user_create_check
    done

    echo "############## EazyRecruit has successfully setup: #########################################"
    echo " "
    echo "Access Url: http://127.0.0.1/admin"
    echo " "
    echo "Admin User: admin@eazyrecruit.in"
    echo " "
    echo $admin_user_create_check

}

restart(){
  sudo docker-compose down
  
  sleep 1
  db_up

  sleep 1
  ez_docker_up
}

destroy(){
  sudo docker-compose down
  if [ -d elastic_search_data ]; then
    cp -r elastic_search_data /tmp/eazyrecruit/
    sudo rm -r elastic_search_data
  fi

  if [ -d elastic_search_db ]; then
    cp -r elastic_search_db /tmp/eazyrecruit/
    sudo rm -r elastic_search_db
  fi
  sudo rm .adminpass
  sudo rm -r ./core/admin

}

if [ "$1" == "restart" ]; then
  restart
elif [ "$1" == "destroy" ]; then 
  destroy
else
  setup
fi