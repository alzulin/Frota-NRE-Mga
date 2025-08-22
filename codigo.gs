// =============================
// Configurações
// =============================
const SPREADSHEET_ID = "1JsaoPaNFF-gNl7n5Ywfu2XvAvhNEWn9QjAdDrDkPmW8"; // sua planilha
const FOLDER_ID      = "1YXHYMVcNlT6gPy8XsitwSx0RcXW4r4VU";             // pasta no Drive para fotos

// =============================
// Utilitários
// =============================
function ensureSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let aba = ss.getSheetByName("Registros");
  if (!aba) {
    aba = ss.insertSheet("Registros");
    aba.appendRow([
      "Tipo","Veículo","Data","Hora","KM","Motorista","Passageiros",
      "Cidades","Locais","Motivo","Combustível","Litros","Técnico","Foto"
    ]);
  }
  return aba;
}

function salvarBlobNaPasta_(blob) {
  if (!blob) return "";
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const arquivo = folder.createFile(blob);
  // Link público com o link
  arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return arquivo.getUrl();
}

// =============================
// Endpoints Web App
// =============================
function doPost(e) {
  try {
    const meta = {
      hasFiles: !!(e && e.files && e.files.foto),
      hasParamBase64: !!(e && e.parameter && e.parameter.fotoBase64),
      postType: (e && e.postData && e.postData.type) ? e.postData.type : "",
    };

    // 1) Normaliza dados vindos por FormData (e.parameter) ou JSON (e.postData.contents)
    let dados = {};
    if (e && e.parameter && Object.keys(e.parameter).length) {
      // multipart/form-data (FormData no front)
      dados.tipo     = e.parameter.tipo || "";
      dados.veiculo  = e.parameter.veiculo || "";
      dados.data     = e.parameter.data || "";
      dados.hora     = e.parameter.hora || "";
      dados.litros   = e.parameter.litros || "";
      dados.tecnico  = e.parameter.tecnico || "";
      // Demais campos não enviados nesta tela ficam vazios
      dados.km = dados.motorista = dados.passageiros = dados.cidades =
      dados.locais = dados.motivo = dados.combustivel = "";
      // Fallback base64 (se vier)
      dados.fotoBase64 = e.parameter.fotoBase64 || "";
      dados.fotoTipo   = e.parameter.fotoTipo   || "";
      dados.fotoNome   = e.parameter.fotoNome   || "";
    } else if (e && e.postData && e.postData.contents) {
      // application/json (fallback)
      dados = JSON.parse(e.postData.contents);
      ["tipo","veiculo","data","hora","litros","tecnico","km","motorista","passageiros","cidades","locais","motivo","combustivel"]
        .forEach(k => { if (!dados[k]) dados[k] = ""; });
    } else {
      throw new Error("Payload vazio ou inválido.");
    }

    // 2) Trata a foto
    let fotoLink = "";
    if (e && e.files && e.files.foto) {
      // Caso 1: arquivo enviado como 'foto' (FormData)
      const blob = e.files.foto; // já é Blob
      fotoLink = salvarBlobNaPasta_(blob);
    } else if (dados.fotoBase64) {
      // Caso 2: fallback base64 (FormData ou JSON)
      // Remove espaços/novas linhas que possam quebrar o decode
      const base64Limpo = String(dados.fotoBase64).replace(/\s/g, "");
      const conteudo = Utilities.base64Decode(base64Limpo);
      const mime = dados.fotoTipo && dados.fotoTipo !== "" ? dados.fotoTipo : "image/jpeg";
      const nome = dados.fotoNome && dados.fotoNome !== "" ? dados.fotoNome : "comprovante.jpg";
      let blob = Utilities.newBlob(conteudo, mime, nome);

      // (Opcional) tentativa de padronizar imagens HEIC/HEIF para JPEG:
      // try { blob = blob.getAs("image/jpeg"); } catch (err) {} // descomente se desejar

      fotoLink = salvarBlobNaPasta_(blob);
    }
    // Se nenhum arquivo veio, deixa fotoLink vazio (não bloqueia o registro)

    // 3) Grava na planilha
    const aba = ensureSheet_();
    const linha = [
      dados.tipo, dados.veiculo, dados.data, dados.hora,
      dados.km, dados.motorista, dados.passageiros, dados.cidades,
      dados.locais, dados.motivo, dados.combustivel, dados.litros,
      dados.tecnico, fotoLink
    ];
    aba.appendRow(linha);

    SpreadsheetApp.flush(); // garante persistência antes de encerrar o doPost

    // 4) Resposta
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "sucesso",
        foto: fotoLink,
        debug: meta
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (erro) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "erro", mensagem: String(erro) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =============================
// (ADICIONAR) Lista de veículos oficiais para aparecerem mesmo sem registros
// =============================
const VEICULOS = [
  "CRONOS – SES4A21","CRONOS – SES4A66","CRONOS – TO3D38","DUSTER – BDR4E41",
  "PARATI – AVA5383","PARATI – AVA6129","PARATI – AVB2284","VOYAGE – BCR3J12"
];

// =============================
// (SUBSTITUIR) doGet: adiciona ?action=status
// =============================
function doGet(e) {
  try {
    const p = (e && e.parameter) ? e.parameter : {};
    const action = (p.action || "").toLowerCase();
    const tipo   = (p.tipo   || "").toLowerCase();

    // /exec?action=status[&veiculo=...]
    if (action === "status") {
      const alvo = p.veiculo || "";
      const payload = getStatusVeiculos_(alvo); // já existente na sua versão de status
      return ContentService
        .createTextOutput(JSON.stringify(payload))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // /exec?tipo=ultimasChegadas
    if (tipo === "ultimaschegadas") {
      const payload = getUltimasChegadas_();
      return ContentService
        .createTextOutput(JSON.stringify(payload))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ping simples
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, msg: "Web App online" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "erro", mensagem: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getUltimasChegadas_() {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh  = ss.getSheetByName("Registros");

  const mapa = {};
  VEICULOS.forEach(v => mapa[v] = null);

  if (sh) {
    const rng  = sh.getDataRange();
    const vals = rng.getValues();         // para timestamps confiáveis (Date/number)
    const disp = rng.getDisplayValues();  // para texto exatamente como exibido (combustível)

    // Índices: 0 Tipo | 1 Veículo | 2 Data | 3 Hora | ... | 10 Combustível
    for (let i = 1; i < vals.length; i++) {
      const tipo        = String(disp[i][0] || "").toLowerCase();
      const veiculo     = String(disp[i][1] || "");
      const dataTxt     = disp[i][2] || "";
      const horaTxt     = disp[i][3] || "";
      const combustivel = disp[i][10] || "";

      if (tipo === "chegada" && (veiculo in mapa)) {
        // Usa valores nativos para compor o timestamp
        const ts = tsFromDateAndTime_(vals[i][2], vals[i][3]);
        const atual = mapa[veiculo];
        if (!atual || ts > atual.ts) {
          mapa[veiculo] = { veiculo, data: dataTxt, hora: horaTxt, combustivel, ts };
        }
      }
    }
  }

  // Retorna todos os veículos (mesmo sem registro)
  return Object.keys(mapa).map(v => {
    const r = mapa[v];
    return r
      ? { veiculo: v, data: r.data, hora: r.hora, combustivel: r.combustivel }
      : { veiculo: v, data: "", hora: "", combustivel: "" };
  });
}



// =============================
// (ADICIONAR) Util: parser de data/hora em timestamp
// =============================
function tsFromDateAndTime_(dataVal, horaVal) {
  // dataVal como Date ou vazio
  let base = 0;
  if (dataVal instanceof Date && !isNaN(dataVal)) {
    // zera hora primeiro
    const d = new Date(dataVal.getFullYear(), dataVal.getMonth(), dataVal.getDate(), 0, 0, 0, 0);
    base = d.getTime();
  } else {
    return 0; // sem data não dá para ordenar
  }

  // horaVal pode ser:
  // - Date com hora (Sheets costuma armazenar horários como Date)
  // - número fração do dia (ex.: 0.5 = 12:00)
  // - string "HH:MM"
  let msHora = 0;

  if (horaVal instanceof Date && !isNaN(horaVal)) {
    msHora = (horaVal.getHours() * 60 + horaVal.getMinutes()) * 60 * 1000;
  } else if (typeof horaVal === "number" && isFinite(horaVal)) {
    const totalMin = Math.round(horaVal * 24 * 60);
    msHora = totalMin * 60 * 1000;
  } else if (typeof horaVal === "string" && /(\d{1,2}):(\d{2})/.test(horaVal)) {
    const m = horaVal.match(/(\d{1,2}):(\d{2})/);
    const h = Math.min(23, parseInt(m[1], 10) || 0);
    const n = Math.min(59, parseInt(m[2], 10) || 0);
    msHora = (h * 60 + n) * 60 * 1000;
  }

  return base + msHora;
}


// =============================
// (ADICIONAR) Monta status por veículo a partir da aba "Registros"
// =============================
function getStatusVeiculos_(filtrarVeiculo) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const aba = ss.getSheetByName("Registros");
  const resultado = { status: "ok", updatedAt: new Date().toISOString(), vehicles: [] };

  // Base por veículo
  const baseMap = {};
  VEICULOS.forEach(v => {
    baseMap[v] = {
      veiculo: v,
      ultimaChegada: null,        // {data,hora,combustivel,ts}
      ultimaSaida: null,          // {data,hora,ts}
      ultimoAbastecimento: null,  // {data,hora,litros,foto,ts}
      emUso: false
    };
  });

  if (aba) {
    const rng = aba.getDataRange();
    const vals = rng.getValues();           // valores nativos (Date, number, string)
    const disp = rng.getDisplayValues();    // como aparece na célula (texto)

    if (vals.length > 1) {
      // Índices do seu cabeçalho:
      // 0 Tipo | 1 Veículo | 2 Data | 3 Hora | 4 KM | 5 Motorista | 6 Passageiros
      // 7 Cidades | 8 Locais | 9 Motivo | 10 Combustível | 11 Litros | 12 Técnico | 13 Foto
      for (let i = 1; i < vals.length; i++) {
        const row  = vals[i];
        const rowD = disp[i];

        const tipo        = String(row[0] || "").toLowerCase();
        const veiculo     = String(row[1] || "");
        const dataVal     = row[2];    // Date ou vazio
        const horaVal     = row[3];    // Date, número (fração do dia) ou string
        const combustivel = String(rowD[10] || ""); // **texto exibido** (Cheio, 3/4, 1/2, 1/4 ou vazio)
        const litros      = String(rowD[11] || "");
        const tecnico     = String(rowD[12] || "");
        const foto        = String(rowD[13] || "");

        if (!veiculo || !(veiculo in baseMap)) continue;

        const ts = tsFromDateAndTime_(dataVal, horaVal); // converte Data/Hora para timestamp

        const ref = baseMap[veiculo];
        if (tipo === "chegada") {
          if (!ref.ultimaChegada || ts > ref.ultimaChegada.ts) {
            ref.ultimaChegada = { data: rowD[2], hora: rowD[3], combustivel, tecnico, ts };
          }
        } else if (tipo === "saída" || tipo === "saida") {
          if (!ref.ultimaSaida || ts > ref.ultimaSaida.ts) {
            ref.ultimaSaida = { data: rowD[2], hora: rowD[3], tecnico, ts };
          }
        } else if (tipo === "abastecimento") {
          if (!ref.ultimoAbastecimento || ts > ref.ultimoAbastecimento.ts) {
            ref.ultimoAbastecimento = { data: rowD[2], hora: rowD[3], litros, foto, ts };
          }
        }
      }

      // Em uso = última saída posterior à última chegada
      Object.values(baseMap).forEach(ref => {
        const tsS = ref.ultimaSaida    ? ref.ultimaSaida.ts    : 0;
        const tsC = ref.ultimaChegada  ? ref.ultimaChegada.ts  : 0;
        ref.emUso = tsS > tsC; // true => NÃO disponível
      });
    }
  }

  const lista = Object.values(baseMap);
  resultado.vehicles = filtrarVeiculo ? lista.filter(v => v.veiculo === filtrarVeiculo) : lista;

  // Remove ts internos
  resultado.vehicles = resultado.vehicles.map(v => ({
    veiculo: v.veiculo,
    ultimaChegada: v.ultimaChegada
      ? { data: v.ultimaChegada.data, hora: v.ultimaChegada.hora, combustivel: v.ultimaChegada.combustivel }
      : null,
    ultimaSaida: v.ultimaSaida
      ? { data: v.ultimaSaida.data, hora: v.ultimaSaida.hora }
      : null,
    ultimoAbastecimento: v.ultimoAbastecimento
      ? { data: v.ultimoAbastecimento.data, hora: v.ultimoAbastecimento.hora, litros: v.ultimoAbastecimento.litros, foto: v.ultimoAbastecimento.foto }
      : null,
    emUso: v.emUso
  }));

  return resultado;
}


