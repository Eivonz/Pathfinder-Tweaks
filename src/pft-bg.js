

function listener(details) {

    let filter = browser.webRequest.filterResponseData(details.requestId);
    let decoder = new TextDecoder("utf-8");
    let encoder = new TextEncoder();

    filter.ondata = (event) => {
        let str = decoder.decode(event.data, { stream: true });
        // Just change any instance of Example in the HTTP response
        // to WebExtension Example.
        // Note that this will maybe not work as expected because the ending of the str can also
        // be "<h1>Examp" (because it is not the full response). So, it is better
        // to get the full response first and then doing the replace.

        // Looking for minified options in minified /public/js/v2.2.4/app/mappage.js
        if (str.includes('order:[1,"asc"]')) {
            //str = str.replaceAll('order:[1,"asc"]', 'order:[2,"desc"]');

            let injection = `
                order:[1,"asc"],
                stateSave: true,
                stateSaveCallback: function (settings, data) {
                    // settings.sInstance : Unique idenfier for specific table instances, but lets use a general savestate shared for all tables of same type
                    let key = settings.sInstance.replace(/.(?<=\-)[^-]*$/,"");
                    localStorage.setItem(
                        'DataTables_' + key,
                        JSON.stringify(data)
                    );
                },
                stateLoadCallback: function (settings) {
                    let key = settings.sInstance.replace(/.(?<=\-)[^-]*$/,"");
                    return JSON.parse(localStorage.getItem('DataTables_' + key));
                }
            `;

            str = str.replaceAll('order:[1,"asc"]', injection);
        }

        filter.write(encoder.encode(str));
        // Doing filter.disconnect(); here would make us process only
        // the first chunk, and let the rest through unchanged. Note
        // that this would break multi-byte characters that occur on
        // the chunk boundary!
    };
    
    filter.onstop = (event) => {
        filter.close();
    };

}

function initializeResponseListener() {

    browser.webRequest.onBeforeRequest.addListener(
        // listener
        listener,
        // filter
        {
            urls: ["*://*/public/js/v2.2.4/app/mappage.js"],
            types: ["script"]
            //urls: ["<all_urls>"],
            //types: ["main_frame", "object", "object_subrequest", "script"]
        },
        // extraInfoSpec
        ["blocking"]
    );
}



/*
    Single message handler to receive communication from content scripts
*/
function handleMessage(message, sender, sendResponse) {

    let tab = sender.tab;

    let respMessage = "";

    switch (message) {
        case "initialize-pft": {

            initializeResponseListener();
            respMessage = `Initializing Pathfinder Tweaks`;

        } break;
        default:
            break;
    }

    sendResponse({ response: respMessage });
}
browser.runtime.onMessage.addListener(handleMessage);
