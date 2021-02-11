import express from 'express';
import bodyParser from 'body-parser';
import { body, validationResult } from 'express-validator';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const nationalIdPattern = '^[0-9]{6}-?[0-9]{4}$';

let viewsPath = new URL('./views', import.meta.url).pathname;
viewsPath = viewsPath.substr(1, viewsPath.length);

let publicURL = new URL('./public', import.meta.url).pathname;
publicURL = publicURL.substring(1, publicURL.length);

const app = express();

app.locals.importantize = (str) => (`${str}!`);

app.set('view engine', 'ejs');
app.set('views', viewsPath);

app.use(express.static(publicURL));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const hostname = '127.0.0.1';
const port = 3000;
const linkName = `${hostname}:${port}`;

app.locals.signature = [];

app.get('/', async (req, res) => {
  try {
    const laug = new pg.Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      password: process.env.DB_PASS,
      database: process.env.DB_DATABASE
    });

    const client = await laug.connect();
    const result = await client.query('SELECT signatures.date, signatures.ssn, signatures.name, signatures.comment, signatures.list FROM signatures');
    client.release();
    await laug.end();
    app.locals.signature = result.rows;
    return res.render('index', { error: '' });
  } catch (e) {
    console.error(e);
    return res.render('index', { error: 'parse error' });
  }
});

app.post(
  '/submit-Signature',

  // Þetta er bara validation, ekki sanitization
  body('name')
    .isLength({ min: 1, max: 64 })
    .withMessage('Nafn má ekki vera tómt eða lengra en 64 stafir'),
  body('ssn')
    .isLength({ min: 1 })
    .withMessage('Kennitala má ekki vera tóm'),
  body('comment')
    .isLength({ min: 0, max: 1024 })
    .withMessage('Comment af langt max 1024 stafir'),
  body('ssn')
    .matches(new RegExp(nationalIdPattern))
    .withMessage('Kennitala verður að vera á formi 000000-0000 eða 0000000000'),
  (req, res, next) => {
    const {
      name = '',
      ssn = '',
      comment = '',
    } = req.body;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((i) => i.msg);
      console.log(errorMessages);
      return res.render('index', { error: errorMessages[0] });
    }

    return next();
  },
  /* Nú sanitizeum við gögnin, þessar aðgerðir munu breyta gildum í body.req */
  // Fjarlægja whitespace frá byrjun og enda
  // „Escape“ á gögn, breytir stöfum sem hafa merkingu í t.d. HTML í entity
  // t.d. < í &lt;
  body('name').trim().escape(),
  body('comment').trim().escape(),
  body('list').trim().escape(),

  // Fjarlægjum - úr kennitölu, þó svo við leyfum í innslátt þá viljum við geyma
  // á normalizeruðu formi (þ.e.a.s. allar geymdar sem 10 tölustafir)
  // Hér gætum við viljað breyta kennitölu í heiltölu (int) en... það myndi
  // skemma gögnin okkar, því kennitölur geta byrjað á 0
  body('ssn').blacklist('-'),

  async (req, res) => {
    const {
      name = '',
      ssn = '',
      comment = '',
      list = ''
    } = req.body;

    try {
      const laug = new pg.Pool({
        user: 'postgres',
        host: '127.0.0.1',
        port: '5432',
        password: '3156',
        database: 'postgres',
      });

      const signature = [name, ssn, comment,list];
      const client = await laug.connect();
      const insertQuery = 'INSERT INTO signatures(name,ssn,comment,list) VALUES($1,$2,$3,$4) RETURNING *';
      let result = await client.query(insertQuery, signature);
      console.log(result.rows);
      result = await client.query('SELECT signatures.date, signatures.ssn, signatures.name, signatures.comment, signatures.list FROM signatures');
      client.release();
      await laug.end();
      app.locals.signature = result.rows;
      return res.render('index', { error: '' });
    } catch (e) {
      console.error(e);
      return res.render('index', { error: 'Kennitala þegar notuð' });
    }
  },
);

app.listen(port, hostname, () => {
  app.locals.hostname = linkName;
  console.log(`Server running at http://${hostname}:${port}/`);
});
