DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS favorites;

CREATE TABLE users(
    user_id serial PRIMARY KEY,
    email varchar(50),
    password char(60),
    first_name varchar(50),
    last_name varchar(50),
    location varchar(50)

);

CREATE TABLE favorites(
    user_id int,
    animal_id int,
    foreign key (user_id) references users(user_id)
);

insert into users(
    email,
    password,
    first_name,
    last_name,
    location)
    values
    (
        'test@gmail.com',
        'test',
        'John',
        'Doe',
        'Colorado'
    );


