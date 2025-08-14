function doPost(e) {
  return processaRequisicao(e);
}

function doGet(e) {
  return ContentService
    .createTextOutput("GET não permitido")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*");
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function processaRequisicao(e) {
  try {
    var dados = JSON.parse(e.postData.contents);

    var planilha = SpreadsheetApp.getActiveSpreadsheet();
    var aba = planilha.getSheetByName("Registros");
    if (!aba) {
      aba = planilha.insertSheet("Registros");
      aba.appendRow([
        "Tipo", "Veículo", "Data", "Hora", "KM", "Motorista", "Passageiros",
        "Cidades", "Locais", "Motivo", "Combustível", "Litros", "Técnico", "Foto"
      ]);
    }

    var fotoLink = "";
    if (dados.fotoBase64) {
      var pasta = DriveApp.getFoldersByName("Frota_NRE_Fotos").hasNext()
        ? DriveApp.getFoldersByName("Frota_NRE_Fotos").next()
        : DriveApp.createFolder("Frota_NRE_Fotos");

      var conteudo = Utilities.base64Decode(dados.fotoBase64);
      var blob = Utilities.newBlob(conteudo, dados.fotoTipo || "image/jpeg", dados.fotoNome || "comprovante.jpg");
      var arquivo = pasta.createFile(blob);
      arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fotoLink = arquivo.getUrl();
    }

    var linha = [
      dados.tipo || "",
      dados.veiculo || "",
      dados.data || "",
      dados.hora || "",
      dados.km || "",
      dados.motorista || "",
      dados.passageiros || "",
      dados.cidades || "",
      dados.locais || "",
      dados.motivo || "",
      dados.combustivel || "",
      dados.litros || "",
      dados.tecnico || "",
      fotoLink
    ];

    aba.appendRow(linha);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "sucesso", foto: fotoLink }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type");

  } catch (erro) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "erro", mensagem: erro.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}
