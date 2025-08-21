// IDs fixos da sua planilha e da pasta no Google Drive
const SPREADSHEET_ID = "1JsaoPaNFF-gNl7n5Ywfu2XvAvhNEWn9QjAdDrDkPmW8";
const FOLDER_ID = "1YXHYMVcNlT6gPy8XsitwSx0RcXW4r4VU";

// Função principal que recebe os dados do formulário via POST
function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);

    // Abre a planilha pelo ID
    const planilha = SpreadsheetApp.openById(SPREADSHEET_ID);
    let aba = planilha.getSheetByName("Registros");

    // Cria a aba caso não exista
    if (!aba) {
      aba = planilha.insertSheet("Registros");
      aba.appendRow([
        "Tipo", "Veículo", "Data", "Hora", "KM", "Motorista", "Passageiros",
        "Cidades", "Locais", "Motivo", "Combustível", "Litros", "Técnico", "Foto"
      ]);
    }

    // Salvar foto do comprovante no Drive
    let fotoLink = "";
    if (dados.fotoBase64) {
      const pasta = DriveApp.getFolderById(FOLDER_ID);
      const conteudo = Utilities.base64Decode(dados.fotoBase64);
      const blob = Utilities.newBlob(
        conteudo,
        dados.fotoTipo || "image/jpeg",
        dados.fotoNome || ("comprovante_" + Date.now() + ".jpg")
      );

      const arquivo = pasta.createFile(blob);
      arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fotoLink = arquivo.getUrl();
    }

    // Monta a linha para registrar
    const linha = [
      dados.tipo || "", dados.veiculo || "", dados.data || "", dados.hora || "",
      dados.km || "", dados.motorista || "", dados.passageiros || "", dados.cidades || "",
      dados.locais || "", dados.motivo || "", dados.combustivel || "", dados.litros || "",
      dados.tecnico || "", fotoLink
    ];
    aba.appendRow(linha);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "sucesso", foto: fotoLink }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (erro) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "erro", mensagem: erro.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Responde ao preflight (CORS) → ESSENCIAL para o fetch funcionar
function doOptions(e) {
  return ContentService.createTextOutput()
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Apenas informativo, caso alguém tente GET
function doGet(e) {
  return ContentService.createTextOutput("Requisições GET não são suportadas.");
}
