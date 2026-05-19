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

const selectedXylan = () => new FormData(els.form).get("xylan");

const activeXylanValue = () => {
  const selected = selectedXylan();
  return selected === "yes" ? "yes" : "no";
};

const recordsForCurrentXylan = () => {
  if (!state.data.xylanAvailable) {
    return state.data.records;
  }

  return state.data.records.filter((record) => record.xylan === activeXylanValue());
};

const recordsForSize = (size) => recordsForCurrentXylan().filter((record) => record.size === size);

const recordsForMaterial = (material) => recordsForCurrentXylan().filter((record) => record.material === material);

const syncMaterialOptions = () => {
  const current = els.material.value;
  const materials = unique(recordsForSize(els.size.value).map((record) => record.material));
  fillSelect(els.material, materials, current);
};

const syncSizeOptions = () => {
  const current = els.size.value;
  const sizes = unique(recordsForMaterial(els.material.value).map((record) => record.size));
  fillSelect(els.size, sizes, current);
};

const syncAllOptions = () => {
  const currentSize = els.size.value;
  const currentMaterial = els.material.value;
  const xylanRecords = recordsForCurrentXylan();
  const sizes = unique(xylanRecords.map((record) => record.size));

  fillSelect(els.size, sizes, currentSize);

  const materials = unique(recordsForSize(els.size.value).map((record) => record.material));
  fillSelect(els.material, materials, currentMaterial);
};

const renderResult = () => {
  const match = state.data.records.find(
    (record) =>
      record.size === els.size.value &&
      record.material === els.material.value &&
      (!state.data.xylanAvailable || record.xylan === activeXylanValue())
  );

  if (!match) {
    els.title.textContent = "Sin coincidencia";
    els.torqueMin.textContent = "--";
    els.torqueMax.textContent = "--";
    els.preloadMin.textContent = "--";
    els.preloadMax.textContent = "--";
    els.sy.textContent = "--";
    els.xylanStatus.textContent = "--";
    els.sourceStatus.textContent = state.data.sourceSheet || "--";
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
  const response = await fetch("data/torque-data.json");

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
    syncSizeOptions();
    renderResult();
  });

  els.form.addEventListener("change", () => {
    syncAllOptions();
    renderResult();
  });
};

init().catch((error) => {
  els.title.textContent = "Error al cargar";
  els.notice.hidden = false;
  els.notice.textContent = error.message;
});
