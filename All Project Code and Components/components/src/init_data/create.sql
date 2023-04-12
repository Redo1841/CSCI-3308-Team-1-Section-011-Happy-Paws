CREATE TABLE users{
    user_id serial,
    username varchar(50),
    password char(60),
    first_name varchar(50),
    last_name varchar(50),
    primary key (user_id)
}

CREATE TABLE favorites{
    user_id int,
    animal_id int,
    foreign key (user_id) references users(user_id)
}
