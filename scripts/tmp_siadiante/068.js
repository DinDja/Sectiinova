function getProtocol()
{
    return window.location.protocol;
}

function getUrl()
{
    return window.location.href;
}

function getHost()
{
    return window.location.host;
}

function getPath()
{
    return window.location.pathname;
}

function getDomain()
{
    return getProtocol()+'//'+getHost();
}

function link(url)
{
    location.href = url;
}

