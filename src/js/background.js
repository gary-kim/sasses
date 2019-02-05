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

// Listen for messages
browser.runtime.onMessage.addListener(message_recieve);
function message_recieve(message, details) {
    switch (message.action) {
        case "analytics_send":
            analytics_send(message.args);
            break;
    }
}

// Analytics
var version = browser.runtime.getManifest().version;
browser.storage.local.get({ analytics: true, id: "" }).then((returned) => {
    if (returned.id.length === 0) {
        browser.storage.local.set({ id: random_str(16, '1234567890abcdef') });
    }
});
function analytics_send(args) {
    browser.storage.local.get({ analytics: true, id: "", schoology_analytics: false }).then((details) => {
        if (!details.analytics || (typeof args.override != 'undefined')) {
            return;
        }
        let cvar_json = JSON.stringify({ '1': ['version', version], "2": ['schoology-analytics', details.schoology_analytics.toString()] });
        let send_data = {
            'idsite': '5',
            'rec': '1',
            'url': args.url,
            '_id': details.id,
            'apiv': '1',
            'cid': details.id,
            '_cvar': cvar_json
        };
        if (typeof args.action !== 'undefined') {
            send_data['action_name'] = args.action;
        }
        if (typeof args.extra === 'object') {
            let extra_entries = Object.entries(args.extra);
            for (let i = 0; i < extra_entries.length; i++) {
                send_data[extra_entries[i][0]] = extra_entries[i][1];
            }
        }
        let request = new URL('https://analytics.ydgkim.com/piwik.php');
        request.search = new URLSearchParams(send_data);
        fetch(request);
    });
}


// Link redirect
browser.webRequest.onBeforeRequest.addListener(
    function (details) {
        skiplink(details);
        return { "redirectUrl": browser.extension.getURL("/web_accessible_resources/redirecting.html") };
    },
    {
        urls: ["https://sas.schoology.com/course/*/materials/link/view/*"],
        types: [
            "main_frame",
            "other"
        ]
    }, ["blocking"]);
async function skiplink(details) {
    let data = (await (await fetch(details.url)).text());
    let redirect = /<iframe src=".*?"/.exec(data)[0].slice(13, -1);
    browser.tabs.update(details.tabId, { url: redirect, loadReplace: true })
}

// Apply CSS
browser.webNavigation.onCommitted.addListener((details) => {
    setTimeout(() => {
        apply_css(details);
    },0);
}, { url:[{hostEquals: "sas.schoology.com"}]});

async function apply_css(details) {
    let css_string = "";
    let url = details.url;
    let path = url.substring(25);
    let info = await browser.storage.local.get({card_color: "", background_color: "", header_color: ""});
    // [card_color !important], [background_color !important], [header_color !important]
    let css_setup = [[], [], []];

    css_string += `a[title='Home'] {background-image: url("${browser.extension.getURL('/web_accessible_resources/logo.png')}") !important}`;
    
    // Configure CSS Setup
    css_setup[1].push(`._1Z0RM[role='menu'], body`);
    css_setup[0].push('.Card-card-data-17m6S')
    css_setup[0].push('div.upcoming-events, div.overdue-submissions-wrapper.overdue-submissions');
    css_setup[2].push('header, header button, header a');

    if(["https://sas.schoology.com/home", "https://sas.schoology.com/", "https://sas.schoology.com/home/", "https://sas.schoology.com"].includes(url))  {
        css_string += `.feed-comments {background: ${info.card_color}; border: 1px solid grey;} div#home-feed-wrapper, `;
        css_setup[1].push('div#main');
        // Maybe also need to set display:block;
        css_setup[0].push('div#home-feed-container');
        css_setup[1].push('div#right-column');
        css_setup[1].push('div#center-inner');
    } else if(/\/courses/.test(path)) {
        css_setup[1].push('div#main-content-wrapper');
        css_setup[1].push('div#center-top');
    } else if(/\/course\/\\d*\//.test(path))    {
        css_setup[0].push('div#sidebar-left a.active');
        css_setup[0].push('div#main-content-wrapper');
        css_setup[0].push('div#center-top');
        css_setup[0].push('.materials-filter-wrapper');
        css_setup[0].push('#edge-filters-btn');
        if(/\/course\/\\d*\/materials\/discussion/.test(path))  {
            css_setup[0].push(`div.discussion-content, div.s-comments-post-form, div.content-top-upper, .discussion-card, h2.page-title, div.course-discussion, div.materials-filter-wrapper, div#center-top, div#main-content-wrapper, div#sidebar-left a[href^='/course/'][href*='/materials']`);
            css_setup[1].push('.s_comments_level');
        }
        if(/\/course\/\\d*\/members/.test(path))    {
            css_setup[0].push(`div.roster-top`);
            css_setup[0].push(`div.enrollment-view-wrapper`);
        }
        if(/\/course\/\\d*\/student_grades/.test(path)) {
            css_setup[0].push(`div.summary-course`);
        }
    } else if(/\/(assignment|event)\/\\d*/.test(path))    {
        css_setup[0].push(`div#sidebar-left a[href^='/course/'][href*='/materials'], div#main-content-wrapper, div#center-top, div.content-top-upper, div.materials-filter-wrapper`);
    } else if(/\/user\/\\d*/.test(path))    {
        css_setup[0].push(`div#sidebar-left a.active, div#main-content-wrapper, div#center-top, div.materials-filter-wrapper`);
    } else if(/\/home\/course-dashboard/.test(path))    {
        css_setup[0].push('section.sgy-card');
        css_setup[2].push('div#main');
    } else if(/\/resources/.test(path)) {
        css_setup[0].push('div#library-wrapper');
    } else if(/\/group\/\\d*/.test(path))   {
        css_setup[0].push(`div#main-content-wrapper, div#center-top, div#sidebar-left a.active`);
    } else {
        css_setup[0].push(`div#main-content-wrapper, div#center-top`)
    }

    if(info.card_color) {
        css_string += `${css_setup[0].toString()} {background-color: ${info.card_color} !important;}`;
    }
    if(info.background_color)   {
        css_string += `${css_setup[1].toString()} {background-color: ${info.background_color} !important;}`;
    }
    if(info.header_color)   {
        css_string += `${css_setup[2].toString()} {background-color: ${info.header_color} !important;}`;
    }

    browser.tabs.insertCSS(details.tabId, {frameId: details.frameId, code: css_string, cssOrigin: "user", runAt: "document_start"});
}

// Block page view analytics
browser.webRequest.onBeforeRequest.addListener(async (details) => {
    if ((await browser.storage.local.get({ "schoology_analytics": false })).schoology_analytics) {
        return;
    }
    return { cancel: true };
}, {
        urls: ["https://sas.schoology.com/stats/*"]
    }, ['blocking']);

// Helpers
function random_str(len, chars) {
    let tr = "";
    for (let i = 0; i < len; i++) {
        tr += chars[Math.floor(Math.random() * chars.length)];
    }
    return tr;
}