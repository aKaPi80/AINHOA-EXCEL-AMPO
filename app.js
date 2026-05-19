const state = {
  data: null,
};

const els = {
  size: document.querySelector("#size-select"),
  material: document.querySelector("#material-select"),
  form: document.querySelector("#lookup-form"),
  title: document.querySelector("#result-title"),
  torqueMin: document.querySelector("#torque-min"),
  torqueMax: document.querySelector("#torque-max"),
  preloadMin: document.querySelector("#preload-min"),
  preloadMax: document.querySelector("#preload-max"),
  sy: document.querySelector("#sy-value"),
  xylanStatus: document.querySelector("#xylan-status"),
  sourceStatus: document.querySelector("#source-status"),
  notice: document.querySelector("#notice"),
};

const selectedXylan = () => new FormData(els.form).get("xylan");

const activeXylanValue = () => {
  const selected = selectedXylan();
  return selected === "yes" ? "yes" : "no";
};

const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(Number(value));
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const fillSelect = (select, values, currentValue) => {
  select.replaceChildren();

  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  }

  if (values.includes(currentValue)) {
    select.value = currentValue;
  }
};

const recordsForCurrentXylan = () => {
  if (!state.data.xylanAvailable) {
    return state.data.records;
  }

  return state.data.records.filter((record) => record.xylan === activeXylanValue());
};

const recordsForSize = (size) => {
  return recordsForCurrentXylan().filter((record) => record.size === size);
};

const syncMaterialOptions = (preferredMaterial = els.material.value) => {
  const materials = unique(recordsForSize(els.size.value).map((record) => record.material));
  fillSelect(els.material, materials, preferredMaterial);
};

const syncAllOptions = (preferredSize = els.size.value, preferredMaterial = els.material.value) => {
  const xylanRecords = recordsForCurrentXylan();
  const sizes = unique(xylanRecords.map((record) => record.size));

  fillSelect(els.size, sizes, preferredSize);
  syncMaterialOptions(preferredMaterial);
};

const findMatch = () => {
  return state.data.records.find(
    (record) =>
      record.size === els.size.value &&
      record.material === els.material.value &&
      (!state.data.xylanAvailable || record.xylan === activeXylanValue())
  );
};

const clearResult = () => {
  els.title.textContent = "Sin coincidencia";
  els.torqueMin.textContent = "--";
  els.torqueMax.textContent = "--";
  els.preloadMin.textContent = "--";
  els.preloadMax.textContent = "--";
  els.sy.textContent = "--";
  els.xylanStatus.textContent = "--";
  els.sourceStatus.textContent = state.data?.sourceSheet || "--";
};

const renderResult = () => {
  const match = findMatch();

  if (!match) {
    clearResult();
    return;
  }

  const xylan = selectedXylan();

  els.title.textContent = `${match.size} - ${match.material}`;
  els.torqueMin.textContent = formatNumber(match.torqueMinNm, 2);
  els.torqueMax.textContent = formatNumber(match.torqueMaxNm, 2);
  els.preloadMin.textContent = formatNumber(match.preloadMinN, 0);
  els.preloadMax.textContent = formatNumber(match.preloadMaxN, 0);
  els.sy.textContent = `${formatNumber(match.preloadSy, 0)} MPa`;
  els.xylanStatus.textContent = xylan === "yes" ? "Si seleccionado" : "No seleccionado";
  els.sourceStatus.textContent = state.data.sourceSheet || "--";

  if (!state.data.xylanAvailable && xylan === "yes") {
    els.notice.hidden = false;
    els.notice.textContent = state.data.note;
  } else {
    els.notice.hidden = true;
    els.notice.textContent = "";
  }
};

const init = async () => {
  const response = await fetch("./data/torque-data.json?v=11");

  if (!response.ok) {
    throw new Error("No se pudo cargar data/torque-data.json");
  }

  state.data = await response.json();

  syncAllOptions();
  renderResult();

  els.size.addEventListener("change", () => {
    syncMaterialOptions();
    renderResult();
  });

  els.material.addEventListener("change", () => {
    renderResult();
  });

  els.form.addEventListener("change", () => {
    syncAllOptions(els.size.value, els.material.value);
    renderResult();
  });
};

init().catch((error) => {
  els.title.textContent = "Error al cargar";
  els.notice.hidden = false;
  els.notice.textContent = error.message;
});

