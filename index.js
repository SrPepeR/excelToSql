var $ = (query) => document.querySelector(query);
var $$ = (query) => document.querySelectorAll(query);

var tableName;
var sqlOperationType;
var sqlOutputFormat;
var selectedFile;
var isRowByRow;
var autoID;
var autoIDName;
var autoIDStarter;

var fileEmpty = true;
var sql = '';

$('#generateBtn').addEventListener('click', () => generateSql());

$('#copyTextBtn').addEventListener('click', () => copyTextToClipboard());

$('#autoID').addEventListener('change', () => autoIDChanged());

function generateSql() {
  getFormData();

  if (!selectedFile) {
    displayMessage('Please select a file', true);
    return;
  }

  displayMessage('Generating SQL...', false);

  readDataFile((isEmpty, sheetData) => {
    if (isEmpty) {
      displayMessage('No data found in the selected file', true);
      return;
    }

    generateSqlFromExtractedData(sheetData);

    manageOutput();
  });
}

function getFormData() {
  tableName = $('#tableName').value || 'default_table';
  sqlOperationType = $('#sqlOperationType').value;
  isRowByRow = $('#rowByRow').checked || false;
  sqlOutputFormat = $('#sqlOutputFormat').value;
  selectedFile = $('#fileSelector')?.files.length > 0 ? $('#fileSelector').files[0] : null;

  getAutoIDData();
}

function readDataFile(callback) {
  var reader = new FileReader();
  reader.onload = function (e) {
    var readedData = new Uint8Array(e.target.result);
    var workbook = XLSX.read(readedData, { type: 'array' });

    var sheetName = workbook.SheetNames[0];
    var sheet = workbook.Sheets[sheetName];
    var sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (sheetData.length === 0) {
      callback(true);
      return;
    }

    callback(false, sheetData);
  };

  reader.readAsArrayBuffer(selectedFile);
}

function generateSqlFromExtractedData(sheetData) {
  var columnNames = sheetData[0];
  var columnValues = sheetData.slice(1);

  switch (sqlOperationType) {
    case 'insert':
      generateInsertSql(columnNames, columnValues);
      break;
    case 'update':
      generateUpdateSql(columnNames, columnValues);
      break;
    default:
      displayMessage('Unsupported SQL operation type', true);
      break;
  }
}

function generateInsertSql(columnNames, columnValues) {
  if (autoID) {
    columnNames.unshift(autoIDName);
  }

  if (isRowByRow) {
    sql = '';
    columnValues.forEach((row, rowIndex) => {
      if (row.length === 0) return;

      let rowSql = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (`;
      if (autoID) {
        rowSql += `${autoIDStarter + rowIndex}, `;
      }
      row.forEach((value, index) => {
        const escapedValue = value.replace(/'/g, "''");
        rowSql += index === row.length - 1 ? `'${escapedValue}'` : `'${escapedValue}', `;
      });
      rowSql += ');';
      sql += rowSql + '\n';
    });
  } else {
    sql = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES`;

    columnValues.forEach((row, rowIndex) => {
      if (row.length === 0) return;

      sql += '\n(';
      if (autoID) {
        sql += `${autoIDStarter + rowIndex}, `;
      }
      row.forEach((value, index) => {
        const escapedValue = value.replace(/'/g, "''");
        sql += index === row.length - 1 ? `'${escapedValue}'` : `'${escapedValue}', `;
      });
      sql += '),';
    });

    sql = sql.slice(0, -1) + ';';
  }
}

function generateUpdateSql(columnNames, columnValues) {
  // TODO: Add where clause support
  if (autoID) {
    columnNames.unshift(autoIDName);
  }

  sql = '';
  columnValues.forEach((row, rowIndex) => {
    if (row.length === 0) return;

    let rowSql = `UPDATE ${tableName} SET `;
    row.forEach((value, index) => {
      const escapedValue = value.replace(/'/g, "''");
      rowSql += `${columnNames[index]} = '${escapedValue}'`;
      if (index < row.length - 1) {
        rowSql += ', ';
      }
    });

    if (autoID) {
      rowSql += ` WHERE ${autoIDName} = ${autoIDStarter + rowIndex};`;
    } else {
      rowSql += ';';
    }

    sql += rowSql + '\n';
  });
}

function copyTextToClipboard() {
  var text = $('#resultMessage').innerText;

  const input = document.createElement('input');
  input.value = text;
  document.body.appendChild(input);
  input.select();

  document.execCommand('copy');
  document.body.removeChild(input);
  displayMessage('Copied to clipboard', false);
}

function autoIDChanged() {
  if ($('#autoID').checked) {
    $('#autoIDNameLbl').style.display = 'flex';
    $('#autoIDStarterLbl').style.display = 'flex';
  } else {
    $('#autoIDNameLbl').style.display = 'none';
    $('#autoIDStarterLbl').style.display = 'none';
  }
}

function getAutoIDData() {
  autoID = $('#autoID').checked;
  autoIDName = $('#autoIDName').value || 'ID';
  autoIDStarter = Number($('#autoIDStarter').value);

  if (autoIDStarter === '' || isNaN(autoIDStarter) || autoIDStarter < 0) {
    autoIDStarter = 1;
    $('#autoIDStarter').value = 1;
  }
}

function displayMessage(message, isWarning = false, canCopy = false) {
  var resultElement = $('section#result');
  var messageElement = $('#resultMessage');
  var copyTextElement = $('#copyTextBtn');
  messageElement.innerText = message;
  
  if (message !== '') {
    resultElement.style.display = 'flex';
  } else {
    resultElement.style.display = 'none';
  }

  if (isWarning) {
    messageElement.style.color = 'red';
  } else {
    messageElement.style.color = 'green';
  }
  
  if (canCopy) {
    copyTextElement.style.display = 'block';
  } else {
    copyTextElement.style.display = 'none';
  }
}

function manageOutput() {
  if (sqlOutputFormat === 'Plain text') {
    displayMessage(sql, false, true);
  } else if (sqlOutputFormat === 'Text file') {
    displayMessage('Downloading file...');
    downloadSqlFile(sql);
  }
}

function downloadSqlFile(sql) {
  var formatedActualDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  var blob = new Blob([sql], { type: 'text/plain' });
  var url = URL.createObjectURL(blob);

  var a = document.createElement('a');
  a.href = url;
  a.download = `${tableName}-${sqlOperationType}-${formatedActualDate}.sql`;
  a.click();
}


