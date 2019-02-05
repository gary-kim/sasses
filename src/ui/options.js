/*
    SAS Schoology Enhancement Suite - A browser extension to improve the experience of SAS Schoology.

    Copyright (C) 2019 Gary Kim (gary@ydgkim.com)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
    
*/

'use strict';

var analyticsid = "";

window.addEventListener("load", main, false);
function main() {
    browser.runtime.sendMessage({action: "analytics_send", args: {url: "sasses://options",action: "Options Page"}});

    browser.storage.local.get({analytics: true, id : "Not set yet", schoology_analytics: false, useful_tooltips: true}).then(function(returned) {
        document.getElementById("analytics").checked = returned.analytics;
        document.getElementById("schoology-analytics").checked = returned.schoology_analytics;
        document.getElementById("useful-tooltips").checked = returned.useful_tooltips;
        document.getElementById("analytics-id").innerText = returned.id;
        analyticsid = returned.id;
    }, function(returned) {});
    document.getElementById("analytics").addEventListener("click", function() {
        let value = document.getElementById("analytics").checked;
        if(!value)  {
            browser.runtime.sendMessage({action: "analytics_send", args: {url: "sasses://disableanalytics.options", action: "Options Page: Disable Analytics", override: true}});
        }
        browser.storage.local.set({analytics: value});
    });
    document.getElementById("schoology-analytics").addEventListener("click", function() {
        let value = document.getElementById("schoology-analytics").checked;
        browser.storage.local.set({schoology_analytics: value});
    });
    document.getElementById('useful-tooltips').addEventListener('click', (e) => {
        let value = e.currentTarget.checked;
        browser.storage.local.set({useful_tooltips: value});
    })
    document.querySelectorAll('.color-selector').forEach((target) => {
        target.addEventListener('click', (e) => {
            let apply_obj = {};
            apply_obj[e.currentTarget.getAttribute('sasses-color-apply-to')] = e.currentTarget.value;
            browser.storage.local.set(apply_obj);
        });
    });
    document.querySelectorAll('.default-color-selector').forEach((target) => {
        target.addEventListener('click', (e) => {
            let apply_obj = {};
            apply_obj[e.currentTarget.getAttribute('sasses-color-apply-to')] = "";
            browser.storage.local.set(apply_obj);
        });
    });
    document.getElementById("source-code-link").addEventListener("click", (event) => {
        let href = event.currentTarget.getAttribute('href');
        browser.runtime.sendMessage({action: "analytics_send", args: {url: href, extra: {link: href}}});
    });
    document.getElementById("website-link").addEventListener("click", (event) => {
        let href = event.currentTarget.getAttribute('href');
        browser.runtime.sendMessage({action: "analytics_send", args: {url: href, extra: {link: href}}});
    });
    document.getElementById("copy-analytics-id").addEventListener("click", (event) => {
        let target = event.currentTarget;
        if(target.getAttribute("attr-pressed"))    {
            return;
        }
        navigator.clipboard.writeText(analyticsid);
        target.innerText = "Copied!";
        target.setAttribute("attr-pressed","true");
        setTimeout(() => {
            target.innerText = "Copy";
            target.removeAttribute("attr-pressed");
        },1500);
    });
}