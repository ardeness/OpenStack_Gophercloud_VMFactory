function copyToClipboard(text) {
	var textArea = document.createElement("textarea");
	textArea.style.position = 'fixed';
	textArea.style.top = 0;
	textArea.style.left = 0;
	textArea.style.width = '2em';
	textArea.style.height = '2em';
	textArea.style.padding = 0;
	textArea.style.border = 'none';
	textArea.style.outline = 'none';
	textArea.style.boxShadow = 'none';
	textArea.style.background = 'transparent';
	textArea.value = text;

	document.body.appendChild(textArea);

	textArea.select();

	try {
		var successful = document.execCommand('copy');
		var msg = successful ? 'successful' : 'unsuccessful';
	} catch (err) {
		console.log('Oops, unable to copy');
	}

	document.body.removeChild(textArea);
}

var App = React.createClass({
	getInitialState: function() {
		return({userName:"", password:""});
	},
	handleLogin: function(userName, password) {
		sessionStorage.setItem('userName', userName);
		sessionStorage.setItem('password', password);
		this.setState({userName:userName, password:password})
	},
	handleLogout: function() {
		sessionStorage.removeItem('userName');
		sessionStorage.removeItem('password');
		this.setState({userName:"", password:""});
	},
	componentDidMount: function() {
		var userName = sessionStorage.getItem('userName');
		var password = sessionStorage.getItem('password');

		if(userName != "" && password != "") {
			this.setState({userName:userName,password:password});
		}
//		$(window).unload(function() {
//			sessionStorage.removeItem('userName');
//			sessionStorage.removeItem('password');
//		});
	},
	render: function() {
		if(this.state.userName && this.state.password) {
			return(<VMFactory	userName={this.state.userName}
						password={this.state.password}
						callback={this.handleLogout}
				/>);
		} else {
			return(<LoginTemplate	header="VMFactory"
						subHeader="VM / Volume create more easily"
						callback={this.handleLogin}
			/>);
		}
	}
});
	

var VMFactory = React.createClass({
	getInitialState: function() {
		return {
			tenantlist:[],
			networklist:[],
			flavorlist:[],
			secgrouplist:[],
			imagelist:[],
			keypairlist:[],
			vmdata:[],
			volumedata:[],
			oszonelist:[],
			volumezonelist:[],
			volumetypelist:[],
			vmcreatelist:[],
			viewdata:[],
			tenant:'',
			tenantID:'',
			tenantenabled:true,
			searchWord:''
		};
	},
	loadTenantListFromServer: function() {
		var self = this;
		$.ajax({
			url: 'tenantlist/',
			dataType: 'json',
			cache: false,
			headers: {
				'UserName':this.props.userName,
				'Password':this.props.password,
			},
			success: function(data) {
				self.setState({tenantlist:data});
				self.loadVolumeTypeListFromServer(data[0]['tenantName']);
				self.loadVMListFromServer(data[0]['tenantName']);
				self.loadNetworkListFromServer(data[0]['tenantName']);
				self.loadFlavorListFromServer(data[0]['tenantName']);
				self.loadSecgroupListFromServer(data[0]['tenantName']);
				self.loadImageListFromServer(data[0]['tenantName']);
				self.loadKeypairListFromServer(data[0]['tenantName']);
				self.loadOSAvailabilityZoneListFromServer(data[0]['tenantName']);
				self.loadVolumeAvailabilityZoneListFromServer(data[0]['tenantName']);
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},
	loadNetworkListFromServer: function(tenant) {
		var self = this;
		var tenantlist = this.state.tenantlist;
		var tenantID = '';

		for(var i=0; i<tenantlist.length; i++) {
			if(tenantlist[i]['tenantName'] == tenant) {
				tenantID = tenantlist[i]['tenantID'];
				break;
			}
		}
		$.ajax({
			url: tenant+'/networklist/'+tenantID+'/',
			dataType: 'json',
			cache: false,
			headers: {
				'UserName':this.props.userName,
				'Password':this.props.password,
			},
			success: function(data) {
				data.sort(function(a, b) {
					if(a.name > b.name) return 1;
					if(a.name < b.name) return -1;
					return 0;
				});
				self.setState({networklist:data});
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},
	loadFlavorListFromServer: function(tenant) {
		var self = this;
		$.ajax({
			url: tenant+'/flavorlist/',
			dataType: 'json',
			cache: false,
			headers: {
				'UserName':this.props.userName,
				'Password':this.props.password,
			},
			success: function(data) {
				data.sort(function(a, b) {
					if(a.name > b.name) return 1;
					if(a.name < b.name) return -1;
					return 0;
				});
				self.setState({flavorlist:data});
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},
	loadSecgroupListFromServer: function(tenant) {
		var self = this;
		$.ajax({
			url: tenant+'/secgrouplist/',
			dataType: 'json',
			cache: false,
			headers: {
				'UserName':this.props.userName,
				'Password':this.props.password,
			},
			success: function(data) {
				data.sort(function(a, b) {
					if(a.name > b.name) return 1;
					if(a.name < b.name) return -1;
					return 0;
				});
				self.setState({secgrouplist:data});
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},
	loadImageListFromServer: function(tenant) {
		var self = this;
		$.ajax({
			url: tenant+'/imagelist/',
			dataType: 'json',
			cache: false,
			headers: {
				'UserName':this.props.userName,
				'Password':this.props.password,
			},
			success: function(data) {
				data.sort(function(a, b) {
					if(a.name > b.name) return 1;
					if(a.name < b.name) return -1;
					return 0;
				});
				self.setState({imagelist:data});
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},
	loadKeypairListFromServer: function(tenant) {
		var self = this;
		$.ajax({
			url: tenant+'/keypairlist/',
			dataType: 'json',
			cache: false,
			headers: {
				'UserName':this.props.userName,
				'Password':this.props.password,
			},
			success: function(data) {
				data.sort(function(a, b) {
					if(a.name > b.name) return 1;
					if(a.name < b.name) return -1;
					return 0;
				});
				self.setState({keypairlist:data});
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},
	loadVMListFromServer: function(tenant) {
		var self = this;
		self.setState({tenantenabled:false});
		$.ajax({
			url: tenant+'/vmlist/',
			dataType: 'json',
			cache: false,
			headers: {
				'UserName':this.props.userName,
				'Password':this.props.password,
			},
			success: function(data) {
				self.setState({vmdata:data,tenant:tenant,tenantenabled:true});
				self.setSearchWord(this.state.searchWord);
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},
	loadVolumeListFromServer: function(tenant) {
		var self = this;
		$.ajax({
			url: tenant+'/volumelist/',
			dataType: 'json',
			cache: false,
			headers: {
				'UserName':this.props.userName,
				'Password':this.props.password,
			},
			success: function(data) {
				self.setState({volumedata:data,tenant:tenant});
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},
	loadOSAvailabilityZoneListFromServer: function(tenant) {
		var self = this;
		$.ajax({
			url: tenant+'/osavailabilityzonelist/',
			dataType: 'json',
			cache: false,
			headers: {
				'UserName':this.props.userName,
				'Password':this.props.password,
			},
			success: function(data) {
				data.sort(function(a, b) {
					if(a > b) return 1;
					if(a < b) return -1;
					return 0;
				});
				self.setState({oszonelist:data});
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},
	loadVolumeAvailabilityZoneListFromServer: function(tenant) {
		var self = this;
		$.ajax({
			url: tenant+'/volumeavailabilityzonelist/',
			dataType: 'json',
			cache: false,
			headers: {
				'UserName':this.props.userName,
				'Password':this.props.password,
			},
			success: function(data) {
				data.sort(function(a, b) {
					if(a > b) return 1;
					if(a < b) return -1;
					return 0;
				});
				self.setState({volumezonelist:data});
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},
	loadVolumeTypeListFromServer: function(tenant) {
		var self = this;
		$.ajax({
			url: tenant+'/volumetypelist/',
			dataType: 'json',
			cache: false,
			headers: {
				'UserName':this.props.userName,
				'Password':this.props.password,
			},
			success: function(data) {
				data.sort(function(a, b) {
					if(a > b) return 1;
					if(a < b) return -1;
					return 0;
				});
				self.setState({volumetypelist:data});
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},
/*
	handleCreateVolumes: function(vmid, volumelist, callback) {
		var self = this;
		$.ajax({
			url: 'createvolumes/?tenant='+this.state.tenant+'&vmid='+vmid,
			dataType: 'json',
			type: 'POST',
			data: JSON.stringify(volumelist),
			success: function(data) {
				callback(true);
				this.loadVMListFromServer(this.state.tenant);
			}.bind(this),
			error: function(xhr, status, err) {
				callback(false);
				console.error(this.props.url, status, err.toString());
				this.loadVMListFromServer(this.state.tenant);
			}.bind(this)
		});
	},
*/
	handleChange: function(event) {
		this.loadVolumeTypeListFromServer(event.target.value);
		this.loadVMListFromServer(event.target.value);
		this.loadNetworkListFromServer(event.target.value);
		this.loadFlavorListFromServer(event.target.value);
		this.loadSecgroupListFromServer(event.target.value);
		this.loadImageListFromServer(event.target.value);
		this.loadKeypairListFromServer(event.target.value);
		this.loadOSAvailabilityZoneListFromServer(event.target.value);
		this.loadVolumeAvailabilityZoneListFromServer(event.target.value);
	},
	updateMe: function(data) {
		var length = this.state.vmdata.length;
		var targetvm = null;

		for(var i=0; i<length; i++) {
			if(this.state.vmdata[i].vmid == data.vmid) {
				targetvm = this.state.vmdata[i];
				break;
			}
		}

		if(targetvm != null) {
			targetvm.vmid			= data.vmid;
			targetvm.vmname 		= data.vmname;
			targetvm.uuid			= data.uuid;
			targetvm.volumes_attached	= data.volumes_attached;
			targetvm.volumedefaulttype	= data.volumedefaulttype;
			targetvm.volumecount		= data.volumecount;
			targetvm.volumedefaultsize	= data.volumedefaultsize;
		}
	},
	setSearchWord: function(searchWord) {
		var viewdata=[];
		var data=this.state.vmdata;
		var len = data.length;
		var ip;
		for(var i=0; i<len; i++) {
			if(data[i].name.indexOf(searchWord) > -1 || data[i].uuid.indexOf(searchWord) > -1) {
				viewdata.push(data[i]);
			}
		}
		viewdata.sort(function(a, b) {
			if(a.name > b.name) return 1;
			if(a.name < b.name) return -1;
			return 0;
		});
		this.setState({searchWord:searchWord, viewdata:viewdata});
	},
	showCreateVM: function() {
		$('#createvm').modal('show');
	},
	createVM: function(data, callback) {
		data["tenant"] = this.state.tenant;
		$.ajax({
			url: this.state.tenant+'/createvm/',
			type: 'POST',
			data: JSON.stringify(data),
			headers: {
				'UserName':this.props.userName,
				'Password':this.props.password,
			},
			success: function(data) {
				this.loadVMListFromServer(this.state.tenant);
				callback(true);
				$('#createvm').modal('hide');
			}.bind(this),
			error: function(xhr, status, err) {
				callback(true);
				console.error(this.state.infourl, status, err.toString());
				$('#createvm').modal('hide');
			}.bind(this)
		});
	},
	componentDidMount: function() {
		this.loadTenantListFromServer();
		$('#createvm').popup({inline:false, hoverable: false, on: 'click'});
	},
	render: function() {
		var TenantSelect = this.state.tenantlist.map(function(info) {
			return (
				<option
					key={info.tenantName}
					value={info.tenantName}
					name={info.tenantName}
				 >
				 {info.tenantName}
				 </option>
			)
		}.bind(this));

		var VMInfoList = this.state.viewdata.map(function(vminfo) {
			return (
				<VMInfo	key={vminfo.uuid}
					tenant={this.state.tenant}
					vmname={vminfo.name}
					uuid={vminfo.uuid}
					volumes_attached={vminfo.volumes_attached}
					volumetypelist={this.state.volumetypelist}
					volumecount={vminfo.datavolumecount}
					volumeprefix={vminfo.datavolumeprefix}
					volumedefaulttype={vminfo.datadefaulttype}
					volumedefaultsize={vminfo.datadefaultsize}
					handleCreateVolumes={this.handleCreateVolumes}
					updateParent={this.updateMe}
				/>
			)
		}.bind(this));

		var volumeTypeSelect = this.state.volumetypelist.map(function(volumetype) {
			return (
				<option
					value={volumetype}
					name={volumetype}
				 >
				 {volumetype}
				 </option>
			)
		}.bind(this));
/*ui one column stackable center aligned page grid*/
/*className="middle aligned ui form" style={{height:'100px'}}>*/
		return (
			<div>
				<div className="ui form">
					<div
						className="four fields">
						<div className="eight field">
							<label>Tenant</label>
							<select className="ui fluid dropdown"
								disabled={!this.state.tenantenabled}
								onChange={this.handleChange}>
								{TenantSelect}
							</select>
						</div>
						<div className="eight field">
							<label>Total : {this.state.vmdata.length} VMs, Search : {this.state.viewdata.length} VMs</label>
							<SearchBar setSearchWord={this.setSearchWord}/>
						</div>
						<div className="six wide field">
						</div>
						<div className="three wide field">
							<label className="right aligned">&nbsp;</label>
							<div className="ui midium button" onClick={this.showCreateVM}>
								Create VM
							</div>
							<div className="ui modal" id="createvm">
							<VMCreateItem
								flavorlist={this.state.flavorlist}
								imagelist={this.state.imagelist}
								networklist={this.state.networklist}
								secgrouplist={this.state.secgrouplist}
								oszonelist={this.state.oszonelist}
								keypairlist={this.state.keypairlist}
								volumetypelist={this.state.volumetypelist}
								createVM={this.createVM}
							/>
							</div>
						</div>
						<div className="two wide field">
							<label className="right aligned">&nbsp;</label>
								<div className="ui midium button" onClick={this.props.callback}>
									Logout
								</div>
						</div>
					</div>
				</div>
				<table className="ui selectable compact celled table structured">
					<thead>
						<tr>
							<th className="two wide center aligned">VM Name</th>
							<th className="two wide center aligned">UUID</th>
							<th className="fifteen wide center aligned" colSpan="2">Volume</th>
						</tr>
					</thead>
					<tbody>
						{VMInfoList}
					</tbody>
				</table>
			</div>
		);}
});

var VMCreateItem = React.createClass({
	getInitialState: function() {
		return({oszone:'',vmname:'',flavor:'',image:'',secgroup:'',network:'',osvolumesize:50, keypair:'', volumetype:''});
	},
	componentDidMount: function() {
	},
	componentWillReceiveProps: function() {
		this.setState({oszone:'',vmname:'',flavor:'',image:'',secgroup:'',network:'',osvolumesize:50, keypair:'',volumetype:''});
	},
	handleVMNameChange: function(e) {
		this.setState({vmname:e.target.value});
	},
	handleOSZoneChange: function(e) {
		this.setState({oszone:e.target.value});
	},
	handleVolumeSizeChange: function(e) {
		this.setState({osvolumesize:e.target.value});
	},
	handleFlavorChange: function(e) {
		this.setState({flavor:e.target.value});
	},
	handleVolumeTypeChange: function(e) {
		this.setState({volumetype:e.target.value});
	},
	handleImageChange: function(e) {
		this.setState({image:e.target.value});
	},
	handleNetworkChange: function(e) {
		this.setState({network:e.target.value});
	},
	handleSecgroupChange: function(e) {
		this.setState({secgroup:e.target.value});
	},
	handleKeypairChange: function(e) {
		this.setState({keypair:e.target.value});
	},
	isCorrect: function() {
		if(	this.state.oszone	== '' ||
			this.state.vmname	== '' ||
			this.state.volumetype	== '' ||
			this.state.image	== '' ||
			this.state.flavor	== '' ||
			this.state.osvolumesize	== 0  ||
			this.state.network	== '' ||
			this.state.secgroup	== '')
			return false;

		return true;
	},
	callBack: function() {
	},
	handleSubmit: function(callback) {
		if(!this.isCorrect()) {
			callback();
			return false;
		}

		var submitdata = {};
		submitdata["oszone"]	= this.state.oszone;
		submitdata["name"]	= this.state.vmname;
		submitdata["volumetype"]= this.state.volumetype;
		submitdata["image"]	= this.state.image;
		submitdata["flavor"]	= this.state.flavor;
		submitdata["size"]	= this.state.osvolumesize;
		submitdata["network"]	= this.state.network;
		submitdata["secgroup"]	= this.state.secgroup;

		if(this.state.keypair != '')
			submitdata["keypair"]	= this.state.keypair;
		
		this.props.createVM(submitdata, callback);

		return true;
	},
	handleRemoveItem: function(e) {
	},
	render: function() {
		var ZoneSelect = this.props.oszonelist.map(function(oszone) {
			return (
				<option
					key={oszone}
					value={oszone}
					name={oszone}
				>
				{oszone}
				</option>
			)
		}.bind(this));
		var FlavorSelect = this.props.flavorlist.map(function(flavor) {
			return (
				<option
					key={flavor.id}
					value={flavor.name}
					name={flavor.name}
				 >
				 {flavor.name}
				 </option>
			)
		}.bind(this));
		var VolumeTypeSelect = this.props.volumetypelist.map(function(volumetype) {
			return (
				<option
					key={volumetype}
					value={volumetype}
					name={volumetype}
				>
				{volumetype}
				</option>
			)
		}.bind(this));
		var ImageSelect = this.props.imagelist.map(function(image) {
			return (
				<option
					key={image.id}
					value={image.name}
					name={image.name}
				>
				{image.name}
				</option>
			)
		}.bind(this));
		var NetworkSelect = this.props.networklist.map(function(network) {
			return (
				<option
					key={network.name}
					value={network.name}
					name={network.name}
				>
				{network.name}
				</option>
			)
		}.bind(this));
		var SecgroupSelect = this.props.secgrouplist.map(function(secgroup) {
			return (
				<option
					key={secgroup.id}
					value={secgroup.name}
					name={secgroup.name}
				>
				{secgroup.name}
				</option>
			)
		}.bind(this));
		var KeypairSelect = this.props.keypairlist.map(function(keypair) {
			return (
				<option
					key={keypair.fingerprint}
					value={keypair.name}
					name={keypair.name}
				>
				{keypair.name}
				</option>
			)
		}.bind(this));
		return(
		<div className="ui center segment">
			<div className="ui form">
				<h4 className="ui dividing header">
				VM Information
				</h4>
				<div className="inline fields">
					<div className="field">
						<select value={this.state.oszone}
							onChange={this.handleOSZoneChange}>
							<option value=''>Zone</option>
							{ZoneSelect}
						</select>
					</div>
					<div className="field">
						<input	id="vmname"
							type="text"
							value={this.state.vmname}
							placeholder="VM Name"
							onChange={this.handleVMNameChange}
						/>
					</div>
					<div className="field">
						<select value={this.state.flavor}
							onChange={this.handleFlavorChange}>
							<option value=''>Flavor</option>
							{FlavorSelect}
						</select>
					</div>
				</div>
				<h4 className="ui dividing header">
				OS Volume Information
				</h4>
				<div className="inline fields">
					<div className="field">
						<select value={this.state.volumetype}
							onChange={this.handleVolumeTypeChange}>
							<option value=''>Volume Type</option>
							{VolumeTypeSelect}
						</select>
					</div>
					<div className="field">
						<select value={this.state.image}
							onChange={this.handleImageChange}>
							<option value=''>Image</option>
							{ImageSelect}
						</select>
					</div>
					<div className="field">
						<input	id="osvolumesize"
							type="text"
							value={this.state.osvolumesize}
							onChange={this.handleVolumeSizeChange}
						/>
						<label>GByte</label>
					</div>
				</div>
				<h4 className="ui dividing header">
				Connection Information
				</h4>
				<div className="inline fields">
					<div className="field">
						<select value={this.state.network}
							onChange={this.handleNetworkChange}>
							<option value=''>Network</option>
							{NetworkSelect}
						</select>
					</div>
					<div className="field">
						<select value={this.state.secgroup}
							onChange={this.handleSecgroupChange}>
							<option value=''>Security</option>
							{SecgroupSelect}
						</select>
					</div>
					<div className="field">
						<select value={this.state.keypair}
							onChange={this.handleKeypairChange}>
							<option value=''>Keypair</option>
							{KeypairSelect}
						</select>
					</div>
				</div>
				<div className="fields">
					<SubmitButton
						label="Create VM"
						className="ui small blue basic labled icon button"
						handleClick={this.handleSubmit}
						callBack={this.callBack}
					/>
				</div>
			</div>
		</div>
		);
	}
});
/*
					<div className="center aligned field">
						<div className="ui fluid blue button" onClick={this.handleSubmit}>
						createVM
						</div>
					</div>
*/
var VolumeCreateItem = React.createClass({
	getInitialState: function() {
		return({volumename:'',
						volumetype:'',
						volumesize:0,
					 });
	},
	componentDidMount: function() {
		this.setState({	volumename:this.props.volumename,
				volumetype:this.props.volumetype,
				volumesize:this.props.volumesize
				});
	},
	handleVolumeNameChange: function(e) {
		this.props.handleVolumeNameChange(this.props.id, e.target.value);
		this.setState({volumename:e.target.value});
	},
	handleVolumeTypeChange: function(e) {
		this.props.handleVolumeTypeChange(this.props.id, e.target.value);
		this.setState({volumetype:e.target.value});
	},
	handleVolumeSizeChange: function(e) {
		this.props.handleVolumeSizeChange(this.props.id, e.target.value);
		this.setState({volumesize:e.target.value});
	},
	handleRemoveItem: function() {
		this.props.handleRemoveItem(this.props.id);
	},
	render: function() {
		var volnameBoxId=this.props.id + "_volumename";
		var volsizeBoxId=this.props.id + "_volumesize";
		return (
			<div
				id={this.props.id}
				className="ui form">
				<div className="inline fields">
				<div className="field">
					<select
						value={this.state.volumetype}
						onChange={this.handleVolumeTypeChange}
						className="ui dropdown">
						{this.props.volumeTypeSelect}
					</select>
				</div>
				<div className="six wide field">
					<input	id={volnameBoxId}
						type="text"
						value={this.state.volumename}
						onChange={this.handleVolumeNameChange}
					/>
				 </div>
				 <div className="four wide field">
					<input	id={volsizeBoxId}
						type="text"
						value={this.state.volumesize}
						onChange={this.handleVolumeSizeChange}
					/>
					<label>Gbyte</label>
				</div>
				<div className="one wide middle aligned field">
					<i	className="middle aligned minus circle icon"
						onClick={this.handleRemoveItem}
						style={{cursor:'pointer'}}
					/>
				</div>
			</div>
			</div>
		);
	}
});

var VMInfo = React.createClass({
	getInitialState: function() {
		//return({volumecreatelist:[{'volumename':'test','volumesize':'50G','volumetype':'OS'}],volumecreatecount:0});
		return({tenant:'',
			vmname:'',
			uuid:'',
			volumes_attached:[],
			volumetypelist:[],
			volumecreatelist:[],
			volumecreatecount:0,
			volumeprefix:'',
			volumedefaulttype:'',
			volumecount:0,
			volumedefaultsize:0});
	},
	updateMe: function() {
		var self = this;
		$.ajax({
			url: this.state.tenant+'/vminfo/'+this.state.uuid+'/',
			dataType: 'json',
			cache: false,
			success: function(data) {
				this.setState({	vmname:data.name,
						uuid:data.uuid,
						volumes_attached:data.volumes_attached,
						volumeprefix:data.datavolumeprefix,
						volumedefaulttype:data.datavolumedefaulttype,
						volumecount:data.datavolumecount,
						volumedefaultsize:data.datadefaultsize});
				this.props.updateParent(data);
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},			
	handleCreateVolumes: function(callback) {
		var self = this;
		var vmid = this.state.uuid;
		var volumelist = this.state.volumecreatelist;
		$.ajax({
			url: tenant+'/createvolumes/'+vmid+'/',
			dataType: 'json',
			type: 'POST',
			data: JSON.stringify(volumelist),
			headers: {
				'UserName':this.props.userName,
				'Password':this.props.password,
			},
			success: function(data) {
				callback(false);
				this.setState({volumecreatelist:[]});
				this.updateMe();
			}.bind(this),
			error: function(xhr, status, err) {
				callback(false);
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},
	addVolumeCreateTarget: function() {
		var volumeinfo = {};
		var volumecreatelist = this.state.volumecreatelist;

		volumeinfo['volumename'] = this.state.volumeprefix + ("0" + (this.state.volumecount + 1)).slice(-2);
		//volumeinfo['volumename'] = this.state.volumeprefix;
		volumeinfo['volumetype'] = this.state.volumedefaulttype;
		volumeinfo['volumesize'] = this.state.volumedefaultsize;
		volumeinfo['id'] = volumeinfo['volumename']+Date.now();

		volumecreatelist.push(volumeinfo);
		this.setState({volumecreatelist:volumecreatelist,volumecount:this.state.volumecount+1});
	},
	componentDidMount: function() {		
		this.setState({	tenant:this.props.tenant,
				vmname:this.props.vmname,
				uuid:this.props.uuid,
				volumes_attached:this.props.volumes_attached,
				volumetypelist:this.props.volumetypelist,
				volumeprefix:this.props.volumeprefix,
				volumedefaulttype:this.props.volumedefaulttype,
				volumecount:this.props.volumecount,
				volumedefaultsize:this.props.volumedefaultsize});
	},
	handleVolumeNameChange: function(id, value) {
		this.handleVolumeCreateInfo(id, 'volumename', value);
	},
	handleVolumeTypeChange: function(id, value) {
		this.setState({volumedefaulttype:value});
		this.handleVolumeCreateInfo(id, 'volumetype', value);
	},
	handleVolumeSizeChange: function(id, value) {
		this.setState({volumedefaultsize:value});
		this.handleVolumeCreateInfo(id, 'volumesize', value);
	},
	handleVolumeCreateInfo: function(id, key, value) {
		var volumecreatelist = this.state.volumecreatelist.slice();
		var idx = -1;
		idx = volumecreatelist.findIndex(x=>x.id==id);

		var row = volumecreatelist[idx];
		row[key] = value;
		volumecreatelist[idx] = row;
		this.setState({volumecreatelist:volumecreatelist});

	},
	handleRemoveItem: function(id) {
		var volumecreatelist = this.state.volumecreatelist.slice();
		var idx = -1;
		idx = volumecreatelist.findIndex(x=>x.id==id);
		volumecreatelist.splice(idx, 1);
		this.setState({volumecreatelist:volumecreatelist});
	},
	handleUUIDCopy: function(even) {
		copyToClipboard(this.props.uuid);
	},
	render: function() {
		var volumeTypeSelect = this.state.volumetypelist.map(function(volumetype) {
			return (
				<option
					key={volumetype}
					value={volumetype}
					name={volumetype}
				 >
				 {volumetype}
				 </option>
			)
		}.bind(this));
		this.state.volumes_attached.sort(function(a, b) {
			if(a.name > b.name) return 1;
			if(a.name < b.name) return -1;
			return 0;
		});
		var VolumeList = this.state.volumes_attached.map(function(volumeinfo) {
			return (
				<div key={volumeinfo.id}>
				<div className="ui horizontal list">
					<div className="item"><b>[{volumeinfo.volume_type}]</b></div>
					<div className="item">{volumeinfo.name}</div>
					<div className="item">{volumeinfo.size}Gbyte</div>
				</div>
				</div>
			)
		}.bind(this));
		//var popupid = "volumecreate_"+this.props.uuid;
		var VolumeCreateList = this.state.volumecreatelist.map(function(volumeinfo) {
			return (
				<VolumeCreateItem
					key={volumeinfo.id}
					id={volumeinfo.id}
					volumetype={volumeinfo.volumetype}
					volumename={volumeinfo.volumename}
					volumesize={volumeinfo.volumesize}
					volumeTypeSelect={volumeTypeSelect}
					handleVolumeNameChange={this.handleVolumeNameChange}
					handleVolumeTypeChange={this.handleVolumeTypeChange}
					handleVolumeSizeChange={this.handleVolumeSizeChange}
					handleRemoveItem={this.handleRemoveItem}
				/>
			);
		}.bind(this));
		return (
			<tr key={this.state.uuid} className="ui center aligned">
				<td className="two wide center aligned">{this.state.vmname}</td>
				<td className="two wide center aligned small"><i title={this.state.uuid} className="external icon" onClick={this.handleUUIDCopy}/></td>
				<td className="thirteen wide center aligned">
					{VolumeList}
					{VolumeCreateList}
					<ActionButton
						icon="add circle icon"
						handleClick={this.addVolumeCreateTarget}
					/>
				</td>
				<td className="two wide center aligned">
					<SubmitButton
						label="Create"
						className="ui small blue basic labled icon button"
						handleClick={this.handleCreateVolumes}
					/>
				</td>
			</tr> 
		);
	}
});

var SubmitButton = React.createClass({
	getInitialState: function() {
		return({status:false});
	},
	handleClick: function() {
		this.setState({status:true});
		this.props.handleClick(this.callBack);
		//this.state.icon="circular icon";
	},
	callBack: function(result) {
		this.setState({status:false});
	},
	render: function() {
		if(this.state.status) {
			var loadingButton=this.props.className+" loading button";
			return (
				<div className={loadingButton}>
					{this.props.label}
				</div>
			);
		}
		else {
			return (
				<div className={this.props.className} onClick={this.handleClick}>
					{this.props.label}
					<i className={this.props.icon} style={{cursor:'pointer'}}/>
				</div>
			);
		}
	}
});

var SearchBar = React.createClass({
	getInitialState: function() {
		return ({searchWord:""});
	},
	render: function() {
		return (
			<div className="ui fluid search center aligned">
				<div className="ui icon input">
					<input
						className="prompt"
						placeholder="VM Name or UUID"
						type="text"
						value={this.state.searchWord}
						onChange={this.onChange}
					/>
					<i className="search icon"></i>
				</div>
			</div>
		);
	}, 
	onChange: function(e) {
		this.props.setSearchWord(e.target.value);
		this.setState({searchWord:e.target.value});
	}
});


var ActionButton = React.createClass({
	handleClick: function() {
		this.props.handleClick();
		//this.state.icon="circular icon";
	},
	render: function() {
		return (
			<div className={this.props.className} onClick={this.handleClick}>
				{this.props.label}<i className={this.props.icon} style={{cursor:'pointer'}}></i>
			</div>
		);
	}
});

var LoginTemplate = React.createClass({
	getInitialState: function() {
		return({userid:"",password:""});
	},
	handleUseridChange: function(e) {
		this.setState({userid: e.target.value});
	},
	handlePasswordChange: function(e) {
		this.setState({password: e.target.value});
	},
	handleLogin: function(e) {
		e.preventDefault();
		var logindata={};
		logindata["userid"] = this.state.userid;
		logindata["password"] = this.state.password;
		$.ajax({
			url: 'login/',
			//dataType: 'json',
			type: 'POST',
			data: JSON.stringify(logindata),
			success: function(data) {
				this.props.callback(this.state.userid, this.state.password);
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},		
	render: function() {
		return (
		<div className="ui center aligned basic segment container" style={{width:'450px'}}>
			<div className="mb">
				<h2 className="ui header aligned left">
					<i className="tasks icon"></i>
					<div className="content">{this.props.header}
						<div className="sub header">
							{this.props.subHeader}
						</div>
					</div>
				</h2>
			</div>
			<form className="ui large form" onSubmit={this.handleLogin}>
				<div className="ui stacked segment">
					<div className="field">
						<div className="ui left icon input">
							<i className="user icon"/>
							<input	id="userid"
								type="text"
								value={this.state.userid}
								name="userid"
								placeholder="ID"
								onChange={this.handleUseridChange}
							/>
						</div>
					</div>
					<div className="field">
						<div className="ui left icon input">
							<i class="lock icon"/>
							<input	id="password"
								type="password"
								value={this.state.password}
								name="password"
								placeholder="Password"
								onChange={this.handlePasswordChange}
							/>
						</div>
					</div>
					<button	className="ui fluid large primary button"
						type="submit">
						Log in
					</button>
				</div>
			</form>
			<div class="ui message">
				New to us? Find <i title={this.props.contact}>Suarez</i>!!!
				<i class="bomb icon"></i>
			</div>
		</div>);
	}
});

ReactDOM.render(
		<App/>,
		document.getElementById('VMFactory')
);
/*
ReactDOM.render(
		<VMFactory/>,
		document.getElementById('VMFactory')
);
*/
