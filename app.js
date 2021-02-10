import express from 'express';
import bodyParser from 'body-parser';
import { body, sanitize, validationResult } from 'express-validator';
import pg from 'pg';

const nationalIdPattern = '^[0-9]{6}-?[0-9]{4}$';
const laug = new pg.Pool({
  user : 'postgres',
  host : '127.0.0.1',
  port : '5432',
  password : '3156',
  database : 'postgres'
});


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

app.get('/', (req, res) => {
    let Signature = {
        name: '',
        comment: '',
        date:''
    };
    res.render('index',{signature: Signature});
});

app.post(
    '/submit-Signature',
  
    // Þetta er bara validation, ekki sanitization
    body('name')
      .isLength({ min: 1 })
      .withMessage('Nafn má ekki vera tómt'),
    body('ssn')
      .isLength({ min: 1 })
      .withMessage('Kennitala má ekki vera tóm'),
    body('ssn')
      .matches(new RegExp(nationalIdPattern))
      .withMessage('Kennitala verður að vera á formi 000000-0000 eða 0000000000'),
    (req, res, next) => {
      const {
        name = '',
        ssn = '',
      } = req.body;
  
      const errors = validationResult(req);
  
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(i => i.msg);
        return res.send(
          `<p>Villa</p>`);
      }
  
      return next();
    },
    /* Nú sanitizeum við gögnin, þessar aðgerðir munu breyta gildum í body.req */
    // Fjarlægja whitespace frá byrjun og enda
    // „Escape“ á gögn, breytir stöfum sem hafa merkingu í t.d. HTML í entity
    // t.d. < í &lt;
    body('name').trim().escape(),
    body('comment').trim().escape(),
  
    // Fjarlægjum - úr kennitölu, þó svo við leyfum í innslátt þá viljum við geyma
    // á normalizeruðu formi (þ.e.a.s. allar geymdar sem 10 tölustafir)
    // Hér gætum við viljað breyta kennitölu í heiltölu (int) en... það myndi
    // skemma gögnin okkar, því kennitölur geta byrjað á 0
    body('ssn').blacklist('-'),
  
    (req, res) => {
  
    const {
        name = '',
        ssn = '',
        comment = ''
        } = req.body;
        
    let signature = 
    {
      "name":name,
      "comment":comment,
      "date":new Date()
    };

    return   res.render('index',{ signature: signature });
    },
  );



app.listen(port, hostname, () => {
    app.locals.hostname = linkName;
    console.log(`Server running at http://${hostname}:${port}/`);
  });