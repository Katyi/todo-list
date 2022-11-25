import './App.css';
import { db } from './firebase';
import { storage } from './firebase';
import { uid } from 'uid';
import { set, ref as ref_database, onValue, remove, update } from 'firebase/database';
import { ref as ref_storage, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { useState, useEffect } from "react";
import dayjs from 'dayjs';

function App() {
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

/**
 * @description Используется hook useEffect для отображения всех задач листа TODO на странице сайта
 * @description Используется dayjs для работы с датами
 * @description Если дата задачи листа TODO прошла, то ставит в столбце "Завершена?" значение "Просрочена", игнорирует если "Выполнена!"
 */
  useEffect(() => {
    const now = dayjs(new Date());
    onValue(ref_database(db), (snapshot) => {
      setTodos([]);
      const data = snapshot.val();
      if (data !== null) {
        Object.values(data).map((todo) => {
          if (now.diff(dayjs(todo.finishDate)) > 0 && todo.done !== 'Выполнена!') {
            todo.done = "Просрочена";
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

/**
 * @description После заполнения Input-ов для title, setDescription setFinishDate вводит новую задачу листа TODO в Firebase database
 * @description Результат появляется на экране через hook useEffect (новая строка в списке задач листа TODO)
 * @description В столбец "Завершена?" присваивает значение "Нет"
*/
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

/**
 * @description После выбора файла для загрузки в столбце "Загрузка файла" и нажатия кнопки "Upload" определяет файл для загрузки (file) и определяет ID задачи листа TODO (divUuid)
 * @description Передает переменные file и divUuid в функцию uploadFiles
 * @param {Event} e - файл для загрузки
*/
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

/**
 * @description Загружает файл для загрузки file в Firebase Storage, определяет имя fileName
 * @description Выгружает ссылку downloadURL загруженного файла file из Firebase Storage
 * @description Передает переменные downloadURL, divUuid, fileName в функцию recordUrl
 * @param {file} file - файл для загрузки
 * @param {string} divUuid - ID задачи листа TODO
*/
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

/**
 * @description Присваивает ссылку загруженного файла url задаче листа TODO c полученным ID в Firebase database
 * @description Присваивает название загруженного файла fileName задаче листа TODO c полученным ID в Firebase database
 * @param {string} url - ссылка на файл для загрузки
 * @param {string} divUuid - ID задачи листа TODO
 * @param {string} fileName - имя файлв загрузки
*/
  const recordUrl = (url, divUuid, fileName) => {
    update(ref_database(db, `/${divUuid}`, divUuid), {
      uuid: divUuid,
      fileUrl: url,
      fileName: fileName
    });
  }

/**
 * @description При нажатии кнопки "Done!" присваивает значение "Выполнена!" задаче листа TODO в Firebase database
 * @description Результат отображается на странице сайта в столбце "Завершена?"
 * @param {object} todo - имя файлв загрузки
*/
  const handleComplete = (todo) => {
    update(ref_database(db, `/${todo.uuid}`, todo.uuid), {
      done: 'Выполнена!'
    });
  }

/**
 * @description меняет значение состояния isEdit на true через setIsEdit, после этого запустится функция handleSubmitChange
 * @description Присивает значения состояниям TempUuid, Title, Description, FinishDate через setTempUuid, setTitle, setDescription, setFinishDate
 * @param {object} todo - имя файлв загрузки
*/
  const handleUpdate = (todo) => {
    setIsEdit(true);
    setTempUuid(todo.uuid);
    setTitle(title.title);
    setDescription(description.description);
    setFinishDate(finishDate.finishDate);
  }

/**
 * @description Кнопка "Submit" поменяется на "Update"
 * @description После заполнения Input-ов для полей title, setDescription setFinishDate при нажатии кнопки "Update" получает новые значения для задачи листа TODO
 * @description обновляет значения title, setDescription setFinishDate в Firebase database
*/
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

/**
 * @description удаляет задачу листа TODO в в Firebase database
 * @param {object} todo - имя файлв загрузки
*/
  const handleDelete = (todo) => {
    remove(ref_database(db, `/${todo.uuid}`));
  }

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
          <div className='title'>Задача</div>
          <div className='description'>Описание</div>
          <div className='finishDate'>Дата завершения</div>
          <div className='done'>Завершена?</div>
          <div className='fileName'>Название файла</div>
          <div className='uploadUrl'>Загрузка файла</div>
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