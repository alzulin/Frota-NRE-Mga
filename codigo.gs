// IDs fixos da sua planilha e da pasta no Google Drive
const SPREADSHEET_ID = "1JsaoPaNFF-gNl7n5Ywfu2XvAvhNEWn9QjAdDrDkPmW8";
const FOLDER_ID = "1YXHYMVcNlT6gPy8XsitwSx0RcXW4r4VU";

function doPost(e) {
  try {
    // --- 1) Normaliza dados vindos como FormData OU JSON ---
    let dados = {};
    if (e && e.parameter && Object.keys(e.parameter).length) {
      // multipart/form-data (FormData no front)
      dados.tipo       = e.parameter.tipo || "";
      dados.veiculo    = e.parameter.veiculo || "";
      dados.data       = e.parameter.data || "";
      dados.hora       = e.parameter.hora || "";
      dados.litros     = e.parameter.litros || "";
      dados.tecnico    = e.parameter.tecnico || "";
      // Campos não enviados nesta tela ficam vazios:
      dados.km = dados.motorista = dados.passageiros = dados.cidades =
      dados.locais = dados.motivo = dados.combustivel = "";
    } else if (e && e.postData && e.postData.contents) {
      // application/json OU text/plain com JSON (fallback)
      dados = JSON.parse(e.postData.contents);
    } else {
      throw new Error("Payload vazio ou inválido.");
    }

    // --- 2) Abre planilha/aba (cria se não existir) ---
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let aba = ss.getSheetByName("Registros");
    if (!aba) {
      aba = ss.insertSheet("Registros");
      aba.appendRow([
        "Tipo","Veículo","Data","Hora","KM","Motorista","Passageiros",
        "Cidades","Locais","Motivo","Combustível","Litros","Técnico","Foto"
      ]);
    }

    // --- 3) Foto: tenta arquivo do FormData; se não houver, tenta base64 ---
    let fotoLink = "";
    const folder = DriveApp.getFolderById(FOLDER_ID);

    if (e && e.files && e.files.foto) {
      // 'foto' é o nome do campo no FormData
      const blob = e.files.foto; // Blob já pronto
      const arquivo = folder.createFile(blob);
      arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fotoLink = arquivo.getUrl();
    } else if (dados.fotoBase64) {
      // Fallback: caso ainda opte por mandar base64 algum dia
      const conteudo = Utilities.base64Decode(dados.fotoBase64);
      const blob = Utilities.newBlob(
        conteudo,
        dados.fotoTipo || "image/jpeg",
        dados.fotoNome || "comprovante.jpg"
      );
      const arquivo = folder.createFile(blob);
      arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fotoLink = arquivo.getUrl();
    }

    // --- 4) Monta e grava linha ---
    const linha = [
      dados.tipo || "", dados.veiculo || "", dados.data || "", dados.hora || "",
      dados.km || "", dados.motorista || "", dados.passageiros || "", dados.cidades || "",
      dados.locais || "", dados.motivo || "", dados.combustivel || "", dados.litros || "",
      dados.tecnico || "", fotoLink
    ];
    aba.appendRow(linha);

    // --- 5) Resposta JSON ---
    return ContentService
      .createTextOutput(JSON.stringify({ status: "sucesso", foto: fotoLink }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (erro) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "erro", mensagem: String(erro) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Opcional: simples verificação do deploy
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, msg: "Web App online" }))
    .setMimeType(ContentService.MimeType.JSON);
}
