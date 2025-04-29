const API = {
    organizationList: "/orgsList",
    analytics: "/api3/analytics",
    orgReqs: "/api3/reqBase",
    buhForms: "/api3/buh",
};

function sendRequest(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);

        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.response);
                        resolve(data);
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    reject(new Error(`Request failed with status ${xhr.status}`));
                }
            }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send();
    });
}

async function run() {
    try {
        const orgOgrns = await sendRequest(API.organizationList);
        const ogrns = orgOgrns.join(",");

        const requisites = await sendRequest(`${API.orgReqs}?ogrn=${ogrns}`);
        const orgsMap = reqsToMap(requisites);

        const analytics = await sendRequest(`${API.analytics}?ogrn=${ogrns}`);
        addInOrgsMap(orgsMap, analytics, "analytics");

        const buh = await sendRequest(`${API.buhForms}?ogrn=${ogrns}`);
        addInOrgsMap(orgsMap, buh, "buhForms");

        render(orgsMap, orgOgrns);
    } catch (error) {
        console.error('Error during data fetch:', error);
    }
}

run();

function reqsToMap(requisites) {
    return requisites.reduce((acc, item) => {
        acc[item.ogrn] = item;
        return acc;
    }, {});
}

function addInOrgsMap(orgsMap, additionalInfo, key) {
    for (const item of additionalInfo) {
        if (orgsMap[item.ogrn]) {
            orgsMap[item.ogrn][key] = item[key];
        }
    }
}

function render(organizationsInfo, organizationsOrder) {
    const table = document.getElementById("organizations");
    table.classList.remove("hide");

    const template = document.getElementById("orgTemplate");
    const container = table.querySelector("tbody");

    organizationsOrder.forEach((item) => {
        renderOrganization(organizationsInfo[item], template, container);
    });
}

function renderOrganization(orgInfo, template, container) {
    const clone = document.importNode(template.content, true);
    const name = clone.querySelector(".name");
    const indebtedness = clone.querySelector(".indebtedness");
    const money = clone.querySelector(".money");
    const address = clone.querySelector(".address");

    name.textContent = (orgInfo.UL && orgInfo.UL.legalName && orgInfo.UL.legalName.short) || "";
    indebtedness.textContent = formatMoney(orgInfo.analytics.s1002 || 0);

    if (
        orgInfo.buhForms &&
        orgInfo.buhForms.length &&
        orgInfo.buhForms[orgInfo.buhForms.length - 1] &&
        orgInfo.buhForms[orgInfo.buhForms.length - 1].year === 2017
    ) {
        const lastForm = orgInfo.buhForms[orgInfo.buhForms.length - 1];
        const endValue = (lastForm.form2 && lastForm.form2[0] && lastForm.form2[0].endValue) || 0;
        money.textContent = formatMoney(endValue);
    } else {
        money.textContent = "—";
    }

    const addressFromServer = orgInfo.UL.legalAddress.parsedAddressRF;
    address.textContent = createAddress(addressFromServer);

    container.appendChild(clone);
}

function formatMoney(money) {
    let formatted = money.toFixed(2).replace('.', ',');
    const rounded = money.toFixed(0);
    for (let i = rounded.length - 3; i > 0; i -= 3) {
        formatted = `${formatted.slice(0, i)} ${formatted.slice(i)}`;
    }
    return `${formatted} ₽`;
}


function createAddress(address) {
    const addressToRender = [];
    if (address.regionName) addressToRender.push(createAddressItem(address, 'regionName'));
    if (address.city) addressToRender.push(createAddressItem(address, 'city'));
    if (address.street) addressToRender.push(createAddressItem(address, 'street'));
    if (address.house) addressToRender.push(createAddressItem(address, 'house'));
    return addressToRender.join(', ');
}

function createAddressItem(address, key) {
    return `${address[key].topoShortName}. ${address[key].topoValue}`;
}