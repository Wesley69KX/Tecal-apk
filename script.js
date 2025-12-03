
const API_URL = "https://script.google.com/macros/s/AKfycbwS8_uvGOsYkGRe9QEItW1F4tE8eGEXwvHJANRwTGTmxOKJJjkaTY-qqN5bW1OEIe8/exec";

async function carregar() {
  const resp = await fetch(API_URL + "?action=getTowers");
  const data = await resp.json();
  document.getElementById("saida").innerHTML = "<pre>" + JSON.stringify(data, null, 2) + "</pre>";
}
