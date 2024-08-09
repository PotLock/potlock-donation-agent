import { providers } from 'near-api-js'
import fs from 'fs'

async function run() {
    const provider = new providers.JsonRpcProvider({ url: "https://rpc.mainnet.near.org" });
    const accountList = await provider.query({
        request_type: "call_function",
        account_id: "registry.potlock.near",
        method_name: "get_projects",
        args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
        finality: "optimistic",
    })
    const projectObject = (JSON.parse(Buffer.from(accountList.result).toString()));
    const data = await Object.values(projectObject).map(async (project, index) => {
        if (project.status === "Approved") {
            const projectDetail = await provider.query({
                request_type: "call_function",
                account_id: "social.near",
                method_name: "get",
                args_base64: (Buffer.from(JSON.stringify({ "keys": [`${project.id}/profile/**`] }))).toString("base64"),
                finality: "optimistic",
            })
            const dataProjectJson = (JSON.parse(Buffer.from(projectDetail.result).toString()));
            const data = Object.keys(dataProjectJson).map((key) => {
                const data = Object.values(dataProjectJson).map((item) => {
                    const data = {
                        index: index,
                        accountId: project.id == key && key,
                        projectId: project.id == key && key,
                        category: item.profile.category?.text ? [item.profile.category.text] : item.profile.category ? [item.profile.category] : JSON.parse(item.profile.plCategories),
                        backgroundImage: item.profile?.backgroundImage ? `https://ipfs.near.social/ipfs/${item.profile.backgroundImage.ipfs_cid}` : '',
                        image: item.profile?.image ? `https://ipfs.near.social/ipfs/${item.profile.image.ipfs_cid}` : '',
                        name: item.profile?.name,
                        description: item.profile?.description,
                        tagline: item.profile?.tagline,
                        socialUrl: item.profile?.linktree,
                        website: item.profile?.website,
                        tags: Object.keys(item.profile?.tags || [])
                    }
                    return data;
                })
                return data[0];
            })
            return data[0];
        }
        // projectList.push(data)
    });
    const projects = await Promise.all(data);
    const dataWrite = ` export const whitelistedProjects = \n` + JSON.stringify(projects, null, 2);
    const SnapshotFilename = './snapshot/projects.js';
    fs.writeFileSync(SnapshotFilename, dataWrite);



    ////////////////////////////////////////// Pots

    const pottList = await provider.query({
        request_type: "call_function",
        account_id: "v1.potfactory.potlock.near",
        method_name: "get_pots",
        args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
        finality: "optimistic",
    })
    const potObject = (JSON.parse(Buffer.from(pottList.result).toString()));
    const dataPot = await Object.values(potObject).map(async (pot) => {
        const potInfo = await provider.query({
            request_type: "call_function",
            account_id: pot.id,
            method_name: "get_config",
            args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
            finality: "optimistic",
        })
        const potInfoData = JSON.parse(Buffer.from(potInfo.result).toString())
        const projectList = await provider.query({
            request_type: "call_function",
            account_id: pot.id,
            method_name: "get_approved_applications",
            args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
            finality: "optimistic",
        })
        const isRoundLive = await provider.query({
            request_type: "call_function",
            account_id: pot.id,
            method_name: "is_round_active",
            args_base64: (Buffer.from(JSON.stringify({}))).toString("base64"),
            finality: "optimistic",
        })
        const dataProjectJson = (JSON.parse(Buffer.from(projectList.result).toString()));

        const data = {
            potId: pot.id,
            name: potInfoData.pot_name,
            description: potInfoData.pot_description,
            project: dataProjectJson.map((item) => item.project_id),
            isRoundLive: JSON.parse(Buffer.from(isRoundLive.result).toString())
        }
        console.log(data)
        return data;

    });
    const pots = await Promise.all(dataPot);

    const dataWritePots = ` export const whitelistedPots = \n` + JSON.stringify(pots, null, 2);
    const SnapshotFilenamePots = './snapshot/pots.js';
    fs.writeFileSync(SnapshotFilenamePots, dataWritePots);


    return {
        projects: projects,
        pots: pots
    };
}
run()