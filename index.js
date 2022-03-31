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
            'create-aliases': {
                lifecycleEvents: ['create'],
                usage: 'Creates Route 53 aliases.',
            },
            'remove-aliases': {
                lifecycleEvents: ['remove'],
                usage: 'Removes Route 53 aliases.',
            },
        };
        this.hooks = {
            // TODO: Enable the printSummary
            // 'aws:info:displayStackOutputs': this.printSummary.bind(this),
            // 'after:info:info': this.printSummary.bind(this),
            'create-zone:create': this.createHostedZone.bind(this),
            'remove-zone:remove': this.removeHostedZone.bind(this),
            'create-aliases:create': this.createAliases.bind(this),
            'remove-aliases:remove': this.createAliases.bind(this),
        };
        this.config =
            this.serverless.service.custom &&
            this.serverless.service.custom['hostedZone'];
        this.provider = this.serverless.getProvider('aws');
    }

    /**
     * Send a log message via the Serverless Framework.
     * @param {any} msg
     */
    log(msg) {
        this.serverless.cli.log(`Hosted Zone: ${msg}`);
    }

    /**
     * Throw an error via the Serverless Framework.
     * @param {any} msg
     */
    throwError(msg) {
        throw new this.serverless.classes.Error(`Hosted Zone: ${msg}`);
    }

    /**
     * Get those hosted zone from the config.
     * @return {string} name
     */
    getHostedZoneName() {
        let { name } = this.config;
        if (!/\.$/.test(name)) {
            name += '.';
        }
        return name;
    }

    /**
     * Get the hosted zone object from AWS.
     * @return {Object} HostedZone object
     */
    async getHostedZone() {
        const name = this.getHostedZoneName();
        const { HostedZones } = await this.provider.request(
            'Route53',
            'listHostedZones',
        );
        return HostedZones.find((x) => x.Name === name);
    }

    /**
     * Logs that the module config is missing.
     */
    reportMissingConfig() {
        this.log('Missing config. Skipping...');
    }

    /**
     * Create a hosted zone.
     */
    async createHostedZone() {
        if (!this.config) {
            return this.reportMissingConfig();
        }

        const { vpc, config, delegationSetId } = this.config;
        const name = this.getHostedZoneName();
        this.log(`Attempting to create ${name}`);
        try {
            const hostedZone = await this.getHostedZone();
            if (hostedZone) {
                this.log(`${name} already exists.`);
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
                        `custom.hostedZone.vpc needs the id property.`,
                    );
                }
                if (!vpc.region) {
                    this.throwError(
                        `custom.hostedZone.vpc needs the region property.`,
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
                        'custom.hostedZone.config needs a ' +
                            'comment or private property.',
                    );
                }
            }
            const { HostedZone } = await this.provider.request(
                'Route53',
                'createHostedZone',
                createParams,
            );
            if (!HostedZone || !HostedZone.Id) {
                this.throwError(`Failed to create ${name}`);
            }
            this.log(`Created ${name}`);
        } catch (e) {
            this.throwError(e.message);
        }
    }

    /**
     * Create the aliases.
     */
    async createAliases() {
        if (!this.config) {
            return this.reportMissingConfig();
        }
        const hostedZone = await this.getHostedZone();
        const { aliases } = this.config;
        if (hostedZone && aliases && Array.isArray(aliases)) {
            aliases.forEach((alias, i) => {
                switch (alias.type) {
                case 'cloudfrontDistribution':
                    const { cname } = alias;
                    this.createDistributionAlias(cname, hostedZone);
                    break;
                default:
                    this.log(
                        `Alias index ${i} does not have a valid entry.`,
                    );
                }
            });
        } else {
            this.log('No aliases to create.');
        }
    }

    /**
     * Create the alias for a CloudFront Distribution.
     * @param {string} cname
     * @param {object} hostedZone HostedZone object
     */
    async createDistributionAlias(cname, hostedZone) {
        if (!hostedZone) {
            this.throwError('Could not find the hosted zone.');
        }
        const hostedZoneId = hostedZone.Id.replace('/hostedzone/', '');
        if (!/\.$/.test(cname)) {
            cname += '.';
        }
        const { DistributionList } = await this.provider.request(
            'CloudFront',
            'listDistributions',
        );
        const distributions = DistributionList.Items || [];
        const distribution = distributions.find((x) => {
            const aliases = (x.Aliases || []).Items || [];
            if (aliases.find((a) => `${a}.` === cname)) {
                return x;
            }
        });
        const listParams = {
            HostedZoneId: hostedZoneId,
        };
        const { ResourceRecordSets } =
            (await this.provider.request(
                'Route53',
                'listResourceRecordSets',
                listParams,
            )) || [];
        const recordSet = ResourceRecordSets.find(
            (x) => x.Name === cname && x.Type === 'A',
        );
        if (recordSet) {
            this.log(`Route 53 record for ${cname} already exists.`);
            return;
        }
        const createParams = {
            ChangeBatch: {
                Changes: [
                    {
                        Action: 'CREATE',
                        ResourceRecordSet: {
                            Name: cname,
                            Type: 'A',
                            AliasTarget: {
                                HostedZoneId: 'Z2FDTNDATAQYW2',
                                DNSName: distribution.DomainName,
                                EvaluateTargetHealth: false,
                            },
                        },
                    },
                ],
                Comment: `CloudFront distribution for ${cname}`,
            },
            HostedZoneId: hostedZoneId,
        };
        await this.provider.request(
            'Route53',
            'changeResourceRecordSets',
            createParams,
        );
        this.log(`Created alias ${cname}`);
    }

    /**
     * Remove a hosted zone.
     */
    removeHostedZone() {
        if (!this.config) {
            return this.reportMissingConfig();
        }
        this.log('Removing...');
        this.throwError('The remove feature currently does not exist.');
    }

    /**
     * Remove the alias records.
     */
    removeAliasRecords() {
        if (!this.config) {
            return this.reportMissingConfig();
        }
        this.log('Removing...');
        this.throwError('The remove feature currently does not exist.');
    }

    /** Print summary */
    printSummary() {
        if (!this.config) {
            return this.reportMissingConfig();
        }
        this.log('Summary...');
        this.throwError('The summary feature currently does not exist.');
    }
};
