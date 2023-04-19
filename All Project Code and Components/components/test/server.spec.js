// Imports the index.js file to be tested.
const server = require('../src/index'); //TO-DO Make sure the path to your index.js is correctly added
// Importing libraries

// Chai HTTP provides an interface for live integration testing of the API's.
const chai = require('chai');
const chaiHttp = require('chai-http');
const { it } = require('node:test');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });

  // ===========================================================================
  // TO-DO: Part A Login unit test case
  it('positive : /login', done => {
    chai
      .request(server)
      .post('/login')
      .send({email: 'test', password: '123'})
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.message).to.equals('Success');
        done();
      });
  });
  it('Negative : /login. Email does not match with Password', done => {
    chai
      .request(server)
      .post('/register')
      .send({email: 'incorrect', password: '123'})
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.message).to.equals('Password and Email do not Match');
        done();
      });
  });
//part b

it('positive : /register', done => {
  chai
    .request(server)
    .post('/register')
    .send({email: 'redo1841@colorado.edu', password: '123'})
    .end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.message).to.equals('Success');
      done();
    });
});

it('Negative : /register. Checking invalid email', done => {
  chai
    .request(server)
    .post('/register')
    .send({email: 'redo1841colorado.edu', password: '123'})
    .end((err, res) => {
      expect(res).to.have.status(200);
      expect(res.body.message).to.equals('Invalid input');
      done();
    });
});
});


