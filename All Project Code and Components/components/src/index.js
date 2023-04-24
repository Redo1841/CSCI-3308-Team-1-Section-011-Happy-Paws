// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const process = require('process');
const express = require('express'); // To build an application server or API
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part B.
require('dotenv').config()

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

app.set('view engine', 'ejs'); // set the view engine to EJS
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

// TODO - Include your API routes here
// Authentication Middleware.
const auth = (req, res, next) => {
  if (req.session.user || req.path === '/login' || req.path === '/register') {
    return next();
  }
  else {
    return res.redirect('/login');
  }
};

// Authentication Required
app.use(auth);

app.get('/', (req, res) => {
  // TODO: Add search functionality
  res.redirect('/discover');
});

app.get('/discover', async (req, res) => {

  const axiosConfig = {
    baseURL: 'https://api.petfinder.com/v2/',
    headers: {
      Authorization: `Bearer ${process.env.PETFINDER_API_KEY}`
    },
    params: {
      limit:10
    }
  };

  const finderRes = await axios.get('/animals', axiosConfig);

  console.log(finderRes.data);

  return res.sendStatus(200);

});

app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});

app.get('/register', (req, res) => {
  res.render('pages/register', {})
});

app.get('/login', (req, res) => {
  res.render('pages/login', {});
});

app.get('/favorite', (req, res) => {
  //TODO: Add favorites
  res.render('pages/favorite', {});
});

app.get('/discover', (req, res) => {
  //TODO: Add favorites
  res.render('pages/home', {});
});

app.post('/favorite', async (req, res) => {
  try {
    const query = 'INSERT INTO favorites(user_id, animal_id) VALUES ($1, $2);';

    await db.none(query, [req.session.user.user_id, req.body.animal_id]);

    //return res.redirect('/')
    return res.sendStatus(200);
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});

app.post('/register', async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);

    const query = `INSERT INTO users(email, password, first_name, last_name, location) VALUES ($1, $2, $3, $4, $5);`

    await db.none(query, [req.body.email, hash, req.body.first_name, req.body.last_name, req.body.location]);


    return res.redirect('/login');
  } catch (err) {
    console.error(err);
    return res.redirect('/register');
  }
});

app.post('/login', async (req, res) => {
  console.log("login")
  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const user = await db.one(query, [req.body.email]);
    const match = await bcrypt.compare(req.body.password, user.password);
    if (match) {
      req.session.user = user;
      req.session.save();
      return res.redirect('/discover');
    }
    console.log("username and password do not match");
    return (res.redirect('/login'));
  } catch (err) {
    console.log(err);
    return res.redirect('/login');
  }
});

(async () => {
  const res = await axios.post('https://api.petfinder.com/v2/oauth2/token',
    {
      grant_type: 'client_credentials',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET
    }
  );
  process.env.PETFINDER_API_KEY = res.data.access_token;
})();


// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');