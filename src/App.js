import './App.sass'
import React,{useEffect, useRef, useState} from 'react';
import Papa from 'papaparse'
import _, { reverse } from 'lodash';
import * as XLSX from 'xlsx';

import JsBarcode from 'jsbarcode'
const { DateTime } = require("luxon");

const StudentView = {
  CARD_VIEW: "CARD_VIEW",
  LIST_VIEW: "LIST_VIEW"
}

function App() {
  const [bookUsersPage, setBookUsersPage] = useState([]);
  const [studentView, setStudentView] = useState([]);
  const [validationMessage, setValidationMessage] = useState('');
  const [isFileValid, setIsFileValid] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const bookLogo = require('./hoshuko-icon.png');

  const requiredColumns = ['学籍番号', '氏名', 'ふりがな', '学年'];

  const validateColumns = (headers) => {
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      setValidationMessage(`必要な列が不足しています: ${missingColumns.join(', ')}`);
      setIsFileValid(false);
      return false;
    } else {
      setValidationMessage('✓ ファイルの形式が正しいです');
      setIsFileValid(true);
      return true;
    }
  };

  const convertToEnjuUserCSV= (hoshukoStudentList) => {
    const enjuUserList = hoshukoStudentList.map(convertHoshukoStudentToEnjuUser)

    const unparseContent = Papa.unparse(enjuUserList, {delimiter: "\t"});

    createDownloadableCSVFile(unparseContent)
  }

  const createDownloadableCSVFile = (enjuUserList) => {
    const element = document.createElement("a");
    const file = new Blob([enjuUserList],    
               {type: 'text/plain;charset=utf-8'});
    
    element.href = URL.createObjectURL(file);

    const importFileName = `hoshuko-lib-import-${DateTime.now().toFormat('yyyy-mm-dd')}.tsv`;

    element.download = importFileName
    document.body.appendChild(element);
    element.click();
  }



  const convertHoshukoStudentToEnjuUser = (hoskukoStudent) => {
    const enjuUser = {};

    enjuUser.username = hoskukoStudent["学籍番号"]
    enjuUser.user_number = hoskukoStudent["学籍番号"]
    enjuUser.full_name = hoskukoStudent["氏名"]
    enjuUser.email = ""
    enjuUser.full_name_transcription = hoskukoStudent["ふりがな"]
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
        name: hoskukoStudent["氏名"],
        user_number:  hoskukoStudent["学籍番号"],
        name_hiragana: hoskukoStudent["ふりがな"],
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

  const isExcelFile = (filename) => {
    return filename.endsWith('.xlsx') || filename.endsWith('.xls');
  };

  const parseExcelFile = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length > 0) {
        const headers = jsonData[0];
        const rows = jsonData.slice(1).map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });
        callback({ data: rows, headers: headers });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = () => {
    if (!_.isEmpty(inputFileRef.current.files)) {
      const file = inputFileRef.current.files[0];
      setSelectedFileName(file.name);
      
      if (isExcelFile(file.name)) {
        parseExcelFile(file, (result) => {
          validateColumns(result.headers);
        });
      } else {
        Papa.parse(file, {
          header: true,
          preview: 1, // Only parse the first row to get headers
          complete: function(results) {
            const headers = results.meta.fields || [];
            validateColumns(headers);
          }
        });
      }
    } else {
      setValidationMessage('');
      setIsFileValid(false);
      setSelectedFileName('');
    }
  };

  const createEnjuUserImportFile = () => {
    if (!isFileValid) {
      alert('有効なファイルを選択してください');
      return;
    }
    if (!_.isEmpty(inputFileRef.current.files)) {
      const file = inputFileRef.current.files[0];
      
      if (isExcelFile(file.name)) {
        parseExcelFile(file, (result) => {
          convertToEnjuUserCSV(result.data);
        });
      } else {
        Papa.parse(file, {header: true, complete: function(results){
          convertToEnjuUserCSV(results.data)
        }});
      }
    }
  }

  const createEnjuUserCards = () => {
    if (!isFileValid) {
      alert('有効なファイルを選択してください');
      return;
    }
    if (!_.isEmpty(inputFileRef.current.files)) {
      const file = inputFileRef.current.files[0];
      
      if (isExcelFile(file.name)) {
        parseExcelFile(file, (result) => {
          console.log(result.data);
          const students = result.data.map(convertHoshukoStudentToBookcard);
          setBookUsersPage(splitByNumberAndYear(students,12));
        });
      } else {
        Papa.parse(file, {header: true, complete: function(results){
            console.log(results.data);
            const students = results.data.map(convertHoshukoStudentToBookcard);
            setBookUsersPage(splitByNumberAndYear(students,12))
        }});
      }
      setStudentView(StudentView.CARD_VIEW);
    }
  }

  const createStudentList = () => {
    console.log("createStudentList");
    if (!isFileValid) {
      alert('有効なファイルを選択してください');
      return;
    }
    if (!_.isEmpty(inputFileRef.current.files)) {
      const file = inputFileRef.current.files[0];
      
      if (isExcelFile(file.name)) {
        parseExcelFile(file, (result) => {
          const students = result.data.map(convertHoshukoStudentToBookcard);
          setBookUsersPage(splitByNumberAndYear(students,20));
        });
      } else {
        Papa.parse(file, {header: true, complete: function(results){
            const students = results.data.map(convertHoshukoStudentToBookcard);
            setBookUsersPage(splitByNumberAndYear(students,20))
        }});
      }
      setStudentView(StudentView.LIST_VIEW);
    }
  }


  const splitByNumberAndYear = (studentArray, splitNumber) => {
    
    const studentsPerYear = _.groupBy(studentArray, 'year')
    
    const pages = []

    for (const [key, value] of Object.entries(studentsPerYear)) {
      const studentsSlices = _.chunk(value, splitNumber);
      for(const students of studentsSlices){
          pages.push(students)
      }
    }

    return pages
  }

  const handlePrint = () => {
    window.print();
  }

  const hasGeneratedCards = bookUsersPage.length > 0;

  return (
    <div className="App">
      <header className="App-header">
        <h1><img alt="補修校図書室" width={40} src={bookLogo} style={{marginRight: '10px', verticalAlign: 'middle'}} />補修校図書ユーザツール</h1>
      </header>
      <div className="container">
      <div className="settings">
        <div>
          <p>生徒リスト</p>
          <div className="file-input-container">
            <input 
              type="file" 
              ref={inputFileRef}
              onChange={handleFileChange}
              accept=".csv,.tsv,.xlsx,.xls"
              style={{
                position: 'absolute',
                left: '-9999px',
                opacity: 0
              }}
              id="fileInput"
            />
            <label htmlFor="fileInput">
              ファイルを選択
            </label>
            {selectedFileName && (
              <span className="file-name">
                {selectedFileName}
              </span>
            )}
          </div>
          
          {validationMessage && (
            <div className={`validation-message ${isFileValid ? 'valid' : 'invalid'}`}>
              {validationMessage}
            </div>
          )}
          
          <button 
            onClick={createEnjuUserCards}
            disabled={!isFileValid}
          >
            生徒名札を作成する
          </button>
          
          <button 
            onClick={createEnjuUserImportFile}
            disabled={!isFileValid}
          >
            生徒図書システムファイルを作成する
          </button>
          
          <button 
            onClick={createStudentList}
            disabled={!isFileValid}
          >
            生徒図書リストを作成する
          </button>

          {hasGeneratedCards && (
            <div style={{marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0'}}>
              <p style={{fontSize: '1.1rem', fontWeight: '600', color: '#4a5568', marginBottom: '1rem'}}>
                印刷・保存
              </p>
              <button 
                onClick={handlePrint}
                style={{
                  background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                  boxShadow: '0 4px 15px rgba(72, 187, 120, 0.3)'
                }}
              >
                🖨️ 印刷・PDF保存
              </button>
            </div>
          )}

        </div>
          
      </div>
      
      <div className="sheets">
        {bookUsersPage.map((bookUsers, index) => {
            if(studentView === StudentView.CARD_VIEW) {
              return <UserCardSheet key={index} bookUsers={bookUsers}></UserCardSheet>
            }else{
              return <UserListSheet key={index} bookUsers={bookUsers}></UserListSheet>
            }
         })
        }
      </div>
    </div>
  </div>
  );
}

export default App;

const UserCard = (props: any) => {
  const bookLogo = require('./hoshuko-icon.png'); 

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

const UserListSheet = (props: any) => {

  return (
  <>
    <section className={'sheet'}
    style={{
        paddingTop: '0mm',
        paddingLeft: '0mm',
        display: 'grid',
        gridTemplateColumns: `repeat(4, 90mm)`,
        gridTemplateRows: `repeat(5, 54mm)`,
        gridGGap: `0px`,
        
    }}>
          
      {props.bookUsers.map((user) => {
              return <UserCard key={user.user_number} username={user.name} usernumber={user.user_number}></UserCard>
          })}
          <div style={{position: 'absolute', left: "272mm", top: "10mm", writingMode: "vertical-rl"}}>{props.bookUsers[0].gakunenJapanese}</div>
    </section>
  </>
  )
}


