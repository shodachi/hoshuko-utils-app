import './App.sass'
import React,{useEffect, useRef, useState} from 'react';
import Papa from 'papaparse'
import _, { reverse } from 'lodash';

import JsBarcode from 'jsbarcode'
const { DateTime } = require("luxon");


function App() {
  const [bookUsersPage, setBookUsersPage] = useState([]);

  const convertToEnjuUserCSV= (hoshukoStudentList) => {
    const enjuUserList = hoshukoStudentList.map(convertHoshukoStudentToEnjuUser)

    const unparseContent = Papa.unparse(enjuUserList);

    createDownloadableCSVFile(unparseContent)
  }

  const createDownloadableCSVFile = (enjuUserList) => {
    const element = document.createElement("a");
    const file = new Blob([enjuUserList],    
               {type: 'text/plain;charset=utf-8'});
    
    element.href = URL.createObjectURL(file);

    const importFileName = `hoshuko-lib-import-${DateTime.now().toFormat('yyyy-mm-dd')}.tsv`;

    element.download = importFileName;
    document.body.appendChild(element);
    element.click();
  }



  const convertHoshukoStudentToEnjuUser = (hoskukoStudent) => {
    const enjuUser = {};

    enjuUser.username = hoskukoStudent["学籍番号"]
    enjuUser.user_number = hoskukoStudent["学籍番号"]
    enjuUser.full_name = hoskukoStudent["名前"]
    enjuUser.email = ""
    enjuUser.full_name_transcription = hoskukoStudent["よみがな"]
    enjuUser.role = "User"
    enjuUser.user_group = "students"
    enjuUser.library = "hoshuko_library"
    enjuUser.locale = "ja"
    enjuUser.locked = "FALSE"
    enjuUser.required_role = "librarian"
    enjuUser.created_at = ""
    enjuUser.updated_at = ""
    enjuUser.expired_at = ""
    enjuUser.keyword_list = ""
    enjuUser.note = ""
    enjuUser.checkout_icalendar_token = ""
    enjuUser.save_checkout_history = "TRUE"
    enjuUser.share_bookmarks = ""

    return enjuUser;
  }

  const convertHoshukoStudentToBookcard = (hoskukoStudent) => {
      return {
        id: hoskukoStudent["学籍番号"],
        name: hoskukoStudent["児童・生徒の氏名"],
        user_number:  hoskukoStudent["学籍番号"],
        name_hiragana: hoskukoStudent["氏名ふりがな "],
        year: gakunenToYearMap[hoskukoStudent["学年"]],
        gakunen: hoskukoStudent["学年"],
        gakunenJapanese: gakunenToGakunenJapaneseMap[hoskukoStudent["学年"]],
        is_first_year: hoskukoStudent["学年"] === "小1",
      }
  }

  const gakunenToYearMap = {
    "小1":1,
    "小2":2,
    "小3":3,
    "小4":4,
    "小5":5,
    "小6":6,
    "中1":7,
    "中2":8,
    "中3":9
  }


  

  const gakunenToGakunenJapaneseMap = {
    "小1":"小一",
    "小2":"小二",
    "小3":"小三",
    "小4":"小四",
    "小5":"小五",
    "小6":"小六",
    "中1":"中一",
    "中2":"中二",
    "中3":"中三"
  }
  


  const inputFileRef = React.useRef();

  const createEnjuUserImportFile = () => {
    if (!_.isEmpty(inputFileRef.current.files)) {
      Papa.parse(inputFileRef.current.files[0],{header: true, complete: function(results){
        convertToEnjuUserCSV(results.data)
      }});
    }
  }

  const createEnjuUserCards = () => {
    if (!_.isEmpty(inputFileRef.current.files)) {
      Papa.parse(inputFileRef.current.files[0],{header: true, complete: function(results){
          console.log(results)
          const students = results.data.map(convertHoshukoStudentToBookcard);
          setBookUsersPage(splitByNumberAndYear(students,12))
      }});
    }
  }

  const splitByNumberAndYear = (studentArray, splitNumber) => {
    
    const studentsPerYear = _.groupBy(studentArray, 'year')
    
    const pages = []

    for (const [key, value] of Object.entries(studentsPerYear)) {
      const studentsSlices = _.chunk(value, 12);
      console.log(studentsSlices)
      for(const students of studentsSlices){
          pages.push(students)
      }
    }
    console.log(pages);

    return pages
}

  return (
    <div className="App">
      <header className="App-header">
        <h1>補修校図書ユーザツール</h1>
      </header>
      <div className="container">
      <div className="settings">
        <div>
          <p>生徒リスト</p>
          <input type="file" 
                ref={inputFileRef}
                />
          <br/><br/>     
          <button onClick={createEnjuUserCards}>カード作成する</button>
          <br/>  
          <button onClick={createEnjuUserImportFile}>インポートファイル作成する</button>

        </div>
          
      </div>
      
      <div className="sheets">
        {bookUsersPage.map((bookUsers, index) => {
            return <UserCardSheet key={index} bookUsers={bookUsers}></UserCardSheet>
         })
        }
      </div>
    </div>
  </div>
  );
}

export default App;

const UserCard = (props: any) => {
  const bookLogo = require('./book-icon.png'); 

  const svgElement = useRef(null)
  let tempNumber = props.usernumber

  useEffect(() => {
    JsBarcode(svgElement.current, tempNumber, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: true,
        margin: 0,
    }, [tempNumber])
})
  return (
    <div className="usercard" style={{
      display: 'inline-flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      justifyContent: 'center',
      alignItems: 'center',
      border: '1px solid #CCCCCC'
    }}>
      {props.username}
      <svg ref={svgElement} xmlns="http://www.w3.org/2000/svg" version="1.1"/>  
      
      <p style={{alignItems: 'center', display: 'inherit'}}><img alt="" width={30} src={bookLogo}></img>補習校図書室</p>

    </div>
  )
}

const UserCardFront = (props: any) => {

  if(props.user.is_first_year){
    return (
      <div className="usercard-front" style={{
        display: 'inline-flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        border: '0px',
        order: reverse
      }}>
        {props.user.name_hiragana}
      </div>
    )
  }else{
    return (
      <div className="usercard-front" style={{
        display: 'inline-flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        border: '0px',
        order: reverse,
      }}>
        <div className='usercard-front-furigana'>{props.user.name_hiragana}</div>
        <div>{props.user.name}</div>
      </div>
    ) 
  }

  
}

const UserCardSheet = (props: any) => {

  return (
  <>
    <section className={'sheet'}
    style={{
        paddingTop: '0mm',
        paddingLeft: '0mm',
        display: 'grid',
        gridTemplateColumns: `repeat(3, 90mm)`,
        gridTemplateRows: `repeat(4, 54mm)`,
        gridGGap: `0px`,
        
    }}>
          
      {props.bookUsers.map((user) => {
              return <UserCard key={user.user_number} username={user.name} usernumber={user.user_number}></UserCard>
          })}
          <div style={{position: 'absolute', left: "272mm", top: "10mm", writingMode: "vertical-rl"}}>{props.bookUsers[0].gakunenJapanese}</div>
    </section>
    <section className={'sheet'}
    style={{
        paddingTop: '0mm',
        paddingLeft: '0mm',
        display: 'grid',
        gridTemplateColumns: `repeat(3, 90mm)`,
        gridTemplateRows: `repeat(4, 54mm)`,
        gridGGap: `0px`,
        gridAutoFlow: 'dense',
        direction: 'rtl'
      
    }}>
      {props.bookUsers.map((user) => {
              return <UserCardFront key={user.user_number} user={user}></UserCardFront>
          })}
    </section>
  </>
  )
}


