'use strict';

module.exports = class ServerlessPlugin {
    /**
     *
     * @param {Serverless} serverless Serverless object.
     * @param {*} options Options object.
     */
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options;
        this.commands = {
            'create-zone': {
                lifecycleEvents: ['create'],
                usage: 'Creates a Route 53 hosted zone.',
            },
            'remove-zone': {
                lifecycleEvents: ['remove'],
                usage: 'Removes a Route 53 hosted zone.',
            },
        };
        this.hooks = {
            'after:deploy:deploy': this.summary.bind(this),
            'after:info:info': this.summary.bind(this),
            'create-zone:create': this.create.bind(this),
            'remove-zone:remove': this.remove.bind(this),
        };
        this.config =
            this.serverless.service.custom &&
            this.serverless.service.custom['hostedZone'];
        this.provider = this.serverless.getProvider('aws');
        if (!this.config) {
            this.throwError('Missing custom.hostedZone');
        }
    }

    log(msg) {
        this.serverless.cli.log(`Hosted Zone: ${msg}`);
    }

    throwError(msg) {
        throw new this.serverless.classes.Error(`Hosted Zone: ${msg}`);
    }

    async create() {
        let { name, vpc, config, delegationSetId } = this.config;
        if (!/\.$/.test(name)) {
            name += '.';
        }
        this.log(`Attempting to create ${name}`);
        try {
            const { HostedZones } = await this.provider.request(
                'Route53',
                'listHostedZones'
            );
            if (HostedZones.find((x) => x.Name === name)) {
                this.log(`${zoneName} already exists.`);
                return;
            }
            const createParams = {
                CallerReference: new Date().toISOString(),
                Name: name,
            };
            if (delegationSetId) {
                createParams.DelegationSetId = delegationSetId;
            }
            if (vpc) {
                if (!vpc.id) {
                    this.throwError(
                        `custom.hostedZone.vpc needs the id property.`
                    );
                }
                if (!vpc.region) {
                    this.throwError(
                        `custom.hostedZone.vpc needs the region property.`
                    );
                }
                createParams.VPC = {
                    VPCId: vpc.id,
                    VPCRegion: vpc.region,
                };
            }
            if (config) {
                createParams.HostedZoneConfig = {};
                if (config.comment) {
                    createParams.HostedZoneConfig.Comment = config.comment;
                }
                if (config.private) {
                    createParams.HostedZoneConfig.PrivateZone =
                        config.privateZone;
                }
                if (!Object.keys(createParams.HostedZoneConfig).length) {
                    this.throwError(
                        `custom.hostedZone.config needs either the comment or private property.`
                    );
                }
            }
            const { HostedZone } = await this.provider.request(
                'Route53',
                'createHostedZone',
                createParams
            );
            if (!HostedZone || !HostedZone.Id) {
                this.throwError(`Failed to create ${zoneName}`);
            }
            this.log(`Created ${zoneName}`);
        } catch (e) {
            this.throwError(e.message);
        }
    }

    remove() {
        this.log('Removing...');
        this.throwError('The remove feature currently does not exist.');
    }

    summary() {
        this.log('Summary...');
        this.throwError('The summary feature currently does not exist.');
    }
};
