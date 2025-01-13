# MYSQL LARGE TABLE MIGRATOR #

A simple app to move huge tables to another tables

How to use

1) Do a backup of your table
2) Create another table to insert the new data
3) Insert on "migration.ts" your credentials to your database
4) Optional: Change the SQL inside "insertQuery const"
5) Run "dev" script to migrate

The app will take a batch of your rows to insert without create a hell inside your server

Ps.: Yep, it works on "mdl_logstore_standard_log", you can do all this steps to reduce the size of your table;
