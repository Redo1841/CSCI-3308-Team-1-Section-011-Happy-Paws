DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users(
    user_id serial,
    username varchar(50),
    password char(60),
    first_name varchar(50),
    last_name varchar(50),
    primary key (user_id)
);