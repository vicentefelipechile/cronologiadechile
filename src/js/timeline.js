const FormatDate = { weekday: "long", year: "numeric", month: "long", day: "numeric" }
const DateObject = new Date()

const CreateDate = (d) => {
    d = d || DateObject

    if (typeof d === "string") {
        d = d.replace(/-/g, "/")
    }

    return new Date(d).toLocaleDateString("es-CL", FormatDate)
}

/* Variables */
MainTimeline = document.getElementById("timeline")
VisTimeline = null

const SidebarArticles = document.getElementById("sidebar-articles")
const LastUpdate = document.getElementById("last-update")

const TimelineTitle = document.getElementById("timeline-title")
const TimelineAuthor = document.getElementById("timeline-author")
const TimelineDate = document.getElementById("timeline-date")
const TimelineDescription = document.getElementById("timeline-description")
const TimelineSource = document.getElementById("timeline-source")

TimelineDate.textContent = CreateDate()

const CopyTimelineTitle = TimelineTitle.cloneNode(true)
const CopyTimelineAuthor = TimelineAuthor.cloneNode(true)
const CopyTimelineDate = TimelineDate.cloneNode(true)
let CopyTimelineDescription = TimelineDescription.cloneNode(true)
const CopyTimelineSource = TimelineSource.cloneNode(true)

/* Functions */
let CacheData = null
let CacheInfo = null

const GetData = (async () => {
    if (CacheData && CacheInfo) {
        return { articles: CacheData, info: CacheInfo }
    }

    const Response = await fetch("https://pub-8894ff44a6f3423591cf59b2b272f41b.r2.dev/cronograma.json")

    if (Response.ok) {
        All = await Response.json()

        CacheData = All["articles"]
        CacheInfo = All["info"]

        return All
    }

    throw new Error("Error al obtener el cronograma")
})

const ShowLastArticles = async (amount) => {
    amount = amount || 8

    const All = await GetData()
    const Data = All["articles"]

    const Start = Data.length - amount
    const End = Data.length

    for (let i = End - 1; i >= Start; i--) {
        const Article = Data[i]

        const ArticleElement = document.createElement("div")
        ArticleElement.classList.add("sidebar-item-subitem")

        // Add a button to move the timeline to the article by id
        const ArticleTitle = document.createElement("h3")
        ArticleTitle.textContent = Article.title
        ArticleTitle.classList.add("sidebar-item-subitem-title")
        ArticleTitle.onclick = (() => {
            VisTimeline.setSelection(i)
            VisTimeline.moveTo(Article.date)

            ShowArticle(i)
        })


        const ArticleDate = document.createElement("p")
        ArticleDate.textContent = CreateDate(Article.date)

        const ArticleDescription = document.createElement("p")

        if (Article.description.length > 100) {
            ArticleDescription.textContent = Article.description.substring(0, 100) + "..."
        } else {
            ArticleDescription.textContent = Article.description
        }

        // Replace al <*> with empty string
        ArticleDescription.textContent = ArticleDescription.textContent.replace(/<[^>]*>/g, " ")

        ArticleElement.appendChild(ArticleTitle)
        ArticleElement.appendChild(ArticleDate)
        ArticleElement.appendChild(ArticleDescription)

        SidebarArticles.appendChild(ArticleElement)

        if (i !== Start) {
            HorizontalLine = document.createElement("hr")
            SidebarArticles.appendChild(HorizontalLine)
        }
    }
}

const ShowArticle = (id) => {
    const Article = CacheData[id]

    TimelineTitle.textContent = Article.title
    TimelineAuthor.textContent = "Por " + Article.author
    TimelineDate.textContent = CreateDate(Article.date)

    TimelineDescription.classList.remove("deny-white-space")

    TimelineDescription.innerHTML = `<a class="permalink" href=https://cronologiadechile.pages.dev/#` + id + `>Obtener enlace permanente</a><br><br>` + Article.description

    // Set source
    TimelineSource.innerHTML = ""

    const unordenedList = document.createElement("ol")

    Article.source.forEach((LinkSource) => {
        const ListItem = document.createElement("li")
        const Link = document.createElement("a")

        LinkText = document.createTextNode(LinkSource)
        Link.appendChild(LinkText)
        Link.href = LinkSource
        ListItem.appendChild(Link)
        unordenedList.appendChild(ListItem)
    })

    TimelineSource.appendChild(unordenedList)
}


document.addEventListener("DOMContentLoaded", async function() {
    const items = new vis.DataSet()
    const options = {
        height: "inherit"
    }

    VisTimeline = new vis.Timeline(MainTimeline, items, options)

    let All = await GetData()
    let Data = All["articles"], Info = All["info"]

    LastUpdate.textContent = "Última actualización: " + CreateDate(Info["last_update"])

    Data = Data.map((item, index) => {
        item.id = index
        return item
    })

    for (const item of Data) {
        items.add({
            id: item.id,
            content: item.title,
            start: item.date
        })
    }

    VisTimeline.on("select", (properties) => {
        // ID
        const ID = properties.items[0]

        // Get current event
        const SelectedTimeline = Object.values(Data).find((Event) => { return Event.title === items.get(ID).content })

        if (SelectedTimeline) {
            ShowArticle(ID)
        } else {
            TimelineTitle.textContent = CopyTimelineTitle.textContent
            TimelineAuthor.textContent = CopyTimelineAuthor.textContent
            TimelineDate.textContent = CopyTimelineDate.textContent

            TimelineDescription.classList.add("deny-white-space")
            TimelineDescription.innerHTML = CopyTimelineDescription.innerHTML
            TimelineSource.innerHTML = CopyTimelineSource.innerHTML
        }
    })

    const timelinepanel = document.getElementsByClassName("vis-panel vis-center")[0]
    timelinepanel.classList.add("cursor-move")

    ShowLastArticles()

    // Check if there is an article in the URL
    let ArticleID = window.location.hash.substring(1)

    if (ArticleID) {
        ArticleID = parseInt(ArticleID)

        VisTimeline.setSelection(ArticleID)
        VisTimeline.moveTo(CacheData[ArticleID].date)

        ShowArticle(ArticleID)
    }

    CopyTimelineDescription = TimelineDescription.cloneNode(true)
})