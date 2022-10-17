//node Project1.js --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results   --excel=Worldcup --dataFolder=data
let minimist =require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");
// const { match } = require("assert");

let args = minimist(process.argv);

let responseKaPromise = axios.get(args.source);
responseKaPromise.then(function(response){
    let html = response.data;
    
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
     let matches = [];
    let matchInfoDivs = document.querySelectorAll("div.ds-border-b.ds-border-line>div");
    for(let i=0;i<matchInfoDivs.length;i++){
         let match={
            t1:" ",
            t2:" ",
            t1s:" ",
            t2s:" ",
            result:" "
         };
         let namesps = matchInfoDivs[i].querySelectorAll("p.ds-text-tight-m");
         match.t1=namesps[0].textContent;
         match.t2=namesps[1].textContent;

        let scoreSpans = matchInfoDivs[i].querySelectorAll("div.ds-text-compact-s>strong");
        if(scoreSpans.length==2){
              match.t1s = scoreSpans[0].textContent;
              match.t2s = scoreSpans[1].textContent;
          }
          else if(scoreSpans.length==1){
              match.t1s = scoreSpans[0].textContent;
              match.t2s = " ";
          }
          else{
              match.t1s = " ";
              match.t2s = " ";
          }
        
         let spanResult = matchInfoDivs[i].querySelector("p.ds-text-tight-s");
             match.result = spanResult.textContent;
         matches.push(match);
       //  console.log(i);

    }
    
    let matchJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json",matchJSON,"utf-8");

    let teams = [];
        for(let i=0;i<matches.length;i++){
          putTeamsInArrayIfMissing(teams,matches[i]);
        }

        for(let i=0;i<matches.length;i++){
            putMatchInAppropriateTeam(teams,matches[i]);
        }

        let teamsJSON = JSON.stringify(teams);
        fs.writeFileSync("teams.json",teamsJSON, "utf-8");
        
        createExcelFile(teams);
        createFolders(teams);
})
function createFolders(teams){
    fs.mkdirSync(args.dataFolder);
    for(let i=0;i<teams.length;i++){
      let teamFN =path.join(args.dataFolder,teams[i].name);
      fs.mkdirSync(teamFN);

      for(let j=0;j<teams[i].matches.length;j++){
        let matchFileName = path.join(teamFN, teams[i].matches[j].vs +".pdf");
        createScoreCard(teams[i].name,teams[i].matches[j],matchFileName);
      }
    }

}
 
function createScoreCard(teamsName, match, matchFileName){
    let t1=teamsName;
    let t2=match.vs;
    let t1s = match.selfScore;
    let t2s = match.oppScore;
    let result= match.result;

    let OriginaltemplateBytes = fs.readFileSync("Template.pdf");
    let promisetoLoadBytes = pdf.PDFDocument.load(OriginaltemplateBytes); //pdf lib se pdfocument ko load kr rhe hai
    promisetoLoadBytes.then(function(pdfDoc){
        let page = pdfDoc.getPage(0);
        
        page.drawText(t1,{
            x:320,
            y:690,
            size:10,
        });

        page.drawText(t1,{
            x:320,
            y:676,
            size:10,
        });
        
        page.drawText(t1,{
            x:320,
            y:662,
            size:10,
        });
        
        page.drawText(t1,{
            x:320,
            y:648,
            size:10,
        });
        page.drawText(t1,{
            x:320,
            y:704,
            size:8,
        });
        
        page.drawText(result);
        let promisetoSave = pdfDoc.save();
        promisetoSave.then(function(changedBytes){
            fs.writeFileSync(matchFileName,changedBytes);
        })

    });
}

function createExcelFile(teams){
    let wb = new excel.Workbook();

    for(let i=0;i<teams.length;i++){
        let sheet = wb.addWorksheet(teams[i].name);

        sheet.cell(1,1).string("VS");
        sheet.cell(1,2).string("Self Score");
        sheet.cell(1,3).string("Opp Score");
        sheet.cell(1,4).string("Result");  
        
       for(let j=0;j<teams[i].matches.length;j++){
            sheet.cell(2+j,1).string(teams[i].matches[j].vs);
            sheet.cell(2+j,2).string(teams[i].matches[j].selfScore);
            sheet.cell(2+j,3).string(teams[i].matches[j].oppScore);
            sheet.cell(2+j,4).string(teams[i].matches[j].result);

        }
    }
    wb.write(args.excel);
}

function putTeamsInArrayIfMissing(teams , match){
    let t1idx =-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name == match.t1){
            t1idx =i;
            break;
        }
    }
    if(t1idx==-1){
        teams.push({
            name:match.t1,
            matches:[]
        });
    }

    let t2idx=-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==match.t2){
            t2idx=i;
            break;
        }
    }
    if(t2idx==-1){
        teams.push({
            name:match.t2,
            matches:[]
        });
    }

}

function putMatchInAppropriateTeam(teams,match){
    let t1idx =-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==match.t1){
            t1idx = i;
            break;
        }
    }
    let team1 =teams[t1idx];
    team1.matches.push({
        vs:match.t2,
        selfScore:match.t1s,
        oppScore:match.t2s,
        result:match.result
    });

    let t2idx=-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==match.t2){
            t2idx=i;
            break;
        }
    }
    let team2 = teams[t2idx];
    team2.matches.push({
        vs:match.t1,
        selfScore:match.t1s,
        oppScore:match.t2s,
        result:match.result
    });
}
