global.ConfigPath = process.cwd() + '/../../conf/';
const sysProject = require('../../com/witshare/proxy/sys-project');

/////////////////////////////////////////////////////////

testFindById();


/////////////////////////////////////////////////////////

async function testFindById() {
    let item = await sysProject.findByProjectGid('123123');
    console.info(item)
}

async function testInsert() {
    await sysProject.MODEL.create({
        projectGid: '123123',
        projectToken: 'szg',
        tokenAddress: '0x13dsdsdsdds',
        platformAddress: '0xsjdsdsodsdsddd',
        projectAddress: '0xprojectAddress',
        softCap: 10000,
        hardCap: 20000,
        minPurchaseAmount: 10,
        startTime: new Date(),
        endTime: new Date(),
        startPrice: '20.1',
        endPrice: '30',
        projectStatus: 0,
        isAvailable: 1,
        createTime: new Date(),
        updateTime: new Date()
    });
}