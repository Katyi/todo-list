import './App.css';
import { db } from './firebase';
import { storage } from './firebase';
import { uid } from 'uid';
import { set, ref as ref_database, onValue, remove, update } from 'firebase/database';
import { ref as ref_storage, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { useState, useEffect } from "react";
import dayjs from 'dayjs';

function App() {
  //----------------------Hooks---------------------------------------------------------------------
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [finishDate, setFinishDate] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [todos, setTodos] = useState([]);
  const [isEdit, setIsEdit] = useState(false);
  const [tempUuid, setTempUuid] = useState("");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const handleTitleChange = (e) => {
    setTitle(e.target.value)
  }
  const handleDescriptionChange = (e) => {
    setDescription(e.target.value)
  }
  const handleFinishDateChange = (e) => {
    setFinishDate(e.target.value)
  }

  //-----------------------------read db-----------------------------------------------------------
  useEffect(() => {
    const now = dayjs(new Date());
    onValue(ref_database(db), (snapshot) => {
      setTodos([]);
      const data = snapshot.val();
      if (data !== null) {
        Object.values(data).map((todo) => {
          if (now.diff(dayjs(todo.finishDate)) > 0 && todo.done !== 'Выполнен!') {
            todo.done = "Просрочен";
          }
          setTodos((oldArray) => [...oldArray, {
            uuid: todo.uuid,
            title: todo.title,
            description: todo.description,
            finishDate: dayjs(todo.finishDate).format('DD-MM-YYYY'),
            fileName: todo.fileName,
            fileUrl: todo.fileUrl,
            done: todo.done,
          }]);
        });
      }
    });
  }, []);

  //-----------------------write db------------------------------------------
  const writeToDatebase = () => {
    const uuid = uid();
    set(ref_database(db, `/${uuid}`), {
      title,
      description,
      finishDate,
      done: "Нет",
      uuid,
      fileUrl,
      fileName
    });
    setTitle("");
    setDescription("");
    setFinishDate("");
  };

  // -----------------Upload file------------------------------------------
  const handleUpload = (e) => {
    e.preventDefault();
    const file = e.target[0].files[0];
    let arr = [].slice.call(e.target.parentElement.children);
    let divUuid = arr.find((val) => {
      if (val.className === 'uuid')
        return val;
    }).textContent;
    console.log(divUuid);
    uploadFiles(file, divUuid);
  }

  const uploadFiles = async (file, divUuid) => {
    if (!file) return;
    const sotrageRef = ref_storage(storage, `files/${file.name}`);
    const uploadTask = uploadBytesResumable(sotrageRef, file);
    let fileName = file.name;

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const prog = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(prog);
      },
      (error) => console.log("Error", error),
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log("File available at", downloadURL);
          recordUrl(downloadURL, divUuid, fileName);
        });
      }
    );
  };

  const recordUrl = (url, divUuid, fileName) => {
    update(ref_database(db, `/${divUuid}`, divUuid), {
      uuid: divUuid,
      fileUrl: url,
      fileName: fileName
    });
  }

  //-------------------completed todo's task-----------------------------------------------------
  const handleComplete = (todo) => {
    update(ref_database(db, `/${todo.uuid}`, todo.uuid), {
      done: 'Выполнен!'
    });
  }

  //--------------------update db----------------------------------------------------------------
  const handleUpdate = (todo) => {
    setIsEdit(true);
    setTempUuid(todo.uuid);
    setTitle(title.title);
    setDescription(description.description);
    setFinishDate(finishDate.finishDate);
  }

  const handleSubmitChange = () => {
    update(ref_database(db, `/${tempUuid}`), {
      title,
      description,
      finishDate,
      uuid: tempUuid,
    });

    setTitle("");
    setDescription("");
    setFinishDate("");
    setIsEdit(false);
  }

  //---------------------------------delete db---------------------------------------------------------------------------
  const handleDelete = (todo) => {
    remove(ref_database(db, `/${todo.uuid}`));
  }

  //                     HTML-------------------------------------------------------------------------------------------
  return (
    <div className='App'>
      <div className='header'>
        <h1>TODO LIST</h1>
        <div className='create_todo'>
          <input type="text" className="title" placeholder='Что делать?' value={title} onChange={handleTitleChange}/>
          <input type="text" className="description" placeholder='Описание' value={description} onChange={handleDescriptionChange} />
          <input type="date" className="finishDate" value={finishDate} onChange={handleFinishDateChange} />
          {isEdit ? (
            <>
              <button onClick={handleSubmitChange}>Update</button>
              <button className='cancel_update' onClick={() => {
                setIsEdit(false);
                setTitle("");
                setDescription("");
                setFinishDate("");
              }}>Cancel Update</button>
            </>
          ) : (
            <button onClick={writeToDatebase}>Submit</button>
          )}
        </div>
        <div className='header_of_tasks'>
          <div className='title'>Заголовок</div>
          <div className='description'>Описание</div>
          <div className='finishDate'>Дата завершения</div>
          <div className='done'>Завершен?</div>
          <div className='fileName'>Название файл</div>
          <div className='uploadUrl'>Загрузка ссылки файла</div>
        </div>
      </div>
      <div className='container'>
        <div className='todos' >
          {todos.map((todo) => (
            <div className='todo'>
              <div className='uuid'>{todo.uuid}</div>
              <div className='title'>{todo.title}</div>
              <div className='description'>{todo.description}</div>
              <div className='finishDate'>{todo.finishDate}</div>
              <div className='done'>{todo.done}</div>
              <div className='fileName'>{todo.fileName}</div>
              <form onSubmit={handleUpload} className='uploadUrl' >
                <input type="file" className='inputfileUrl'/>
                <button type='submit'> Upload </button>
              </form>
              <button onClick={() => handleComplete(todo)}>Done!</button>
              <button onClick={() => handleUpdate(todo)} >Update</button>
              <button onClick={() => handleDelete(todo)} >Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;