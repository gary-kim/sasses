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

var homepage_urls = ["https://sas.schoology.com/home", "https://sas.schoology.com/", "https://sas.schoology.com/home/", "https://sas.schoology.com"];
let loading_spinner = `<div style="color: white;"><div class="sk-circle"><div class="sk-circle1 sk-child"></div><div class="sk-circle2 sk-child"></div><div class="sk-circle3 sk-child"></div><div class="sk-circle4 sk-child"></div><div class="sk-circle5 sk-child"></div><div class="sk-circle6 sk-child"></div><div class="sk-circle7 sk-child"></div><div class="sk-circle8 sk-child"></div><div class="sk-circle9 sk-child"></div><div class="sk-circle10 sk-child"></div><div class="sk-circle11 sk-child"></div><div class="sk-circle12 sk-child"></div></div></div>`;
var settings;
async function get_settings()   {
    settings = await browser.storage.local.get({"collapse_overdue": false, "useful_tooltips": true});
}
get_settings();


window.addEventListener("load", main, false);

function main(event) {
    if (homepage_urls.includes(window.location.href) || /^https:\/\/sas\.schoology\.com\/home/.test(window.location.href)) {
        homepage(event);
        analytics_send("homepage");
    } else {
        analytics_send("default");
    }
}

function analytics_send(action_input)   {
    browser.runtime.sendMessage({action: "analytics_send", args: {url: window.location.href,action: action_input}});
}

async function homepage(event) {
    // Allow collapsing overdue
    run_multiple(overdue_collapse, [500,1000,1500]);
    async function overdue_collapse()   {

        let overdue_submissions_node = document.querySelector('div.overdue-submissions');
        if(overdue_submissions_node == null || overdue_submissions_node.getAttribute('sasses-overdue-collapse-set') === 'true') {
            return;
        }
        overdue_submissions_node.setAttribute('sasses-overdue-collapse-set', 'true');

        let upcoming_list_node = overdue_submissions_node.querySelector('.upcoming-list');

        let overdue_collapse_arrow_node = document.createElement('img');
        overdue_collapse_arrow_node.src = browser.extension.getURL('/web_accessible_resources/triangle.svg');
        overdue_collapse_arrow_node.classList.add('sasses-arrow');
        overdue_collapse_arrow_node.classList.add(settings.collapse_overdue? `sasses-arrow-right`:`sasses-arrow-down`);
        overdue_submissions_node.querySelector('h3').prepend(overdue_collapse_arrow_node);
        overdue_collapse_arrow_node.parentNode.addEventListener('click', toggle_overdue_collapse);
        toggle_overdue_collapse( settings.collapse_overdue );


        function toggle_overdue_collapse( setto )    {
            if(typeof setto === 'boolean')  {
                settings.collapse_overdue = setto;
            } else {
                settings.collapse_overdue = !settings.collapse_overdue;
            }
            browser.storage.local.set({"collapse_overdue": settings.collapse_overdue});
            if(settings.collapse_overdue)   {
                overdue_collapse_arrow_node.classList.remove("sasses-arrow-down");
                overdue_collapse_arrow_node.classList.add("sasses-arrow-right");
                upcoming_list_node.classList.add("sasses-hide");
            } else {
                overdue_collapse_arrow_node.classList.remove("sasses-arrow-right");
                overdue_collapse_arrow_node.classList.add("sasses-arrow-down");
                upcoming_list_node.classList.remove("sasses-hide");
            }
        }

    }

    // Set tooltips
    // let runtimes = 1;
    // let interval = setInterval(set_tipsys, 300);
    if(settings.useful_tooltips)    {
        run_multiple(set_tipsys, [500,1000,1500]);
    }
    async function set_tipsys() {
        // If needed, this function can be run multiple times.
        /*if (runtimes <= 0) {
            clearInterval(interval);
        }
        runtimes--;*/
        let upcoming_list_nodelist = document.querySelectorAll('div.upcoming-list'); // Two side panels
        upcoming_list_nodelist.forEach((upcoming_list_node) => {

            let upcoming_event_nodelist = upcoming_list_node.querySelectorAll('.upcoming-event'); // Every event in the side panels
            upcoming_event_nodelist.forEach(async (upcoming_event_node) => {
                // If already processed, do not run operation again
                if (upcoming_event_node.getAttribute('sasses-processed-tooltip') === 'true') {
                    return;
                }
                upcoming_event_node.querySelector('.infotip-content').innerHTML = loading_spinner; // Set tooltip to loading circle until loaded.
                upcoming_event_node.addEventListener('mouseover', () => {
                    upcoming_event_node.setAttribute('sasses-mouseover', "true"); // Keep track of whether the mouse is on top of the element.
                    setTimeout(() => {
                        if(upcoming_event_node.getAttribute('sasses-mouseover') === 'true') {
                            load_tooltip();
                        }
                    },200);
                });
                async function load_tooltip() {
                    // If information is already loaded, do not load again.
                    if(upcoming_event_node.getAttribute('sasses-loaded-tooltip') === 'true')    {
                        return; 
                    }
                    upcoming_event_node.setAttribute('sasses-loaded-tooltip', 'true');
                    let info_content = get_info(await sasses_fetch(upcoming_event_node.querySelector('a').href));

                    let infotip_content_node = document.createElement('span');
                    infotip_content_node.className = 'infotip-content';
                    infotip_content_node.appendChild(info_content);
                    
                    upcoming_event_node.querySelector('.infotip-content').replaceWith(infotip_content_node);
                    // Set attribute to tell other instances of the function that the tooltip has already been loaded.
                    
                    if(upcoming_event_node.getAttribute('sasses-mouseover') === 'true') {
                        let mouseover = document.createEvent('Event');
                        mouseover.initEvent('mouseover', true, false);
                        let mouseleave = document.createEvent('Event');
                        mouseleave.initEvent('mouseout', true, false);
                        upcoming_event_node.firstChild.firstChild.dispatchEvent(mouseleave);
                        upcoming_event_node.firstChild.firstChild.dispatchEvent(mouseover);
                    }
                }
                upcoming_event_node.addEventListener('mouseleave', () => {
                    upcoming_event_node.setAttribute('sasses-mouseover', 'false');
                });
                upcoming_event_node.setAttribute('sasses-processed-tooltip', 'true');
            });
        });
    }
    function get_info(input) {
        let template = document.createElement('template');
        template.innerHTML = input;
        let tr = undefined;
        template.content.childNodes.forEach((node) => {
            if(typeof node.querySelectorAll !== 'function') {
                return;
            }
            let temp = node.querySelectorAll('div#main-inner');
            if (temp.length !== 0) {
                tr = temp[0];
            }
        })
        if (typeof tr === 'undefined') {
            return html2nodelist(loading_spinner)[0];
        }
        tr.querySelector('div.comment-container').remove();
        return tr;
    }
}

let current_request_count = 0;
// Somehow make a queue for requests that need to be made.
async function sasses_fetch(arg1, arg2) {
    let promise = new Promise(async function make_request(resolve,reject)   {
        console.log(`SASSES: Requesting information from ${arg1}`);
        let tr = await (await fetch(arg1, arg2)).text();
        if(/too many requests/i.test(tr))   {
            setTimeout(make_request,2000);
        } else {
            resolve(tr);
        }
    });
    return promise;
}

function run_multiple(run,times)    {
    times.forEach((time) => {
        setTimeout(run,time);
    });
}

/**
 * 
 * @param {string} arg1 html string to be converted to listnode
 * @returns {NodeList} the list of nodes made from the html string
 */
function html2nodelist(arg1) {
    let template = document.createElement('template');
    template.innerHTML = arg1;
    return template.content.childNodes;
}