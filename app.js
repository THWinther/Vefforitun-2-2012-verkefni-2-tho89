import express from 'express';
import bodyParser from 'body-parser';


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
    res.render('index')
});

app.post('/submit-Signature',(req,res)=> {
    console.log(req.body.name);
    console.log(req.body.ssn);
    console.log(req.body.comment);
    console.log(req.body.list);
});



app.listen(port, hostname, () => {
    app.locals.hostname = linkName;
    console.log(`Server running at http://${hostname}:${port}/`);
  });