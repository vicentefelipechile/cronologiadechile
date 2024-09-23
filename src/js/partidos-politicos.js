/*==============================================
               Partidos Políticos
==============================================*/

const PP_UnorderedList = document.getElementById("partidos-politicos")

PP = {}

PP.MainPath = "partidospoliticos.json"

PP.GetPartidos = async () => {
    if (PP.CacheData) { return PP.CacheData }

    const response = await fetch(PP.MainPath)
    return await response.json()
}

PP.GetPartidosByShortName = async (ShortName) => {
    if ( !PP.CacheData ) { await PP.GetPartidos() }

    PP.CacheData.forEach((Partido) => {
        if (Partido["name_short"] === ShortName) {
            return element
        }
    })

    return null
}

PP.Main = async () => {
    Partidos = await PP.GetPartidos()

    Partidos.forEach((Partido) => {
        // Fullname : (ShortName) - Ideology - Name
        // const FullName = "(" + (Partido["name_short"]).padStart(3, " ").padEnd(4, " ") + ") - " + Partido["name"]
        const FullName = "(" + (
            Partido["name_short"]
        ).padStart(2, " ").padEnd(3, " ").padStart(4, " ") + ") - " + 
        (Partido["ideology"]).padEnd(9, " ") + " - " + Partido["name"]

        const ListItem = document.createElement("li")
        ListItem.textContent = FullName

        const picture = document.createElement("picture")

        const icon = document.createElement("img")
        icon.src = "/src/img/" + Partido["name_short"].toLowerCase() + ".png"
        icon.width = 18
        icon.height = 18
        icon.style.marginLeft = "10px"

        picture.appendChild(icon)

        ListItem.appendChild(picture)

        // add style "white-space:pre"
        ListItem.style.whiteSpace = "pre"

        PP_UnorderedList.appendChild(ListItem)
    })
}

PP.Main()